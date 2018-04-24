const app = require("express")();
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const moment = require("moment");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(morgan("combined"));
app.use(cors());

const port = process.env.PORT || 3000;

const db = require("./db");

const CONST = {
  SEM1: moment.duration(5, "month"),
  SEM2: moment.duration(10, "month"),
  STARTYEAR: moment.duration(7, "month")
};

function getCurrentSemester() {
  const now = moment();
  const year = moment([now.year()]);
  let duration = moment.duration(now.diff(year));
  let curYear = now.year();
  if (duration > CONST.STARTYEAR) {
    duration = duration.subtract(CONST.STARTYEAR);
  } else {
    duration = duration.add(5, "month");
    curYear -= 1;
  }

  if (duration < CONST.SEM1) {
    return {
      sem: 1,
      year: curYear
    };
  }
  if (duration < CONST.SEM2) {
    return {
      sem: 2,
      year: curYear
    };
  }
  return {
    sem: 3,
    year: curYear
  };
}

app.get("/listCourses", function(req, res) {
  const courseID = req.query["courseID"] || "";
  const courseName = req.query["courseName"] || "";
  const isGened = req.query["isGened"];
  if ((courseID.length < 3 || courseID.length > 7) && courseName.length < 3) {
    res.json(400, { error: "input error" });
    return;
  }
  let genquery = "";
  if (isGened) {
    genquery = "Gened%";
  }
  const semester = getCurrentSemester();

  db.query(
    `SELECT DISTINCT
    co.courseID AS subjectID, 
    co.CName AS subjectName
FROM
    class AS cl,
    course AS co
WHERE
    cl.Sem = ? AND cl.Year = ? 
        AND cl.courseID LIKE ?
        AND cl.courseID = co.courseID
        AND co.CName LIKE ?
        AND co.Type LIKE ?`,
    [semester.sem, semester.year, courseID + "%", courseName + "%", genquery],
    function(error, results, fields) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ data: results });
      }
    }
  );
});

app.get("/courseDetail", function(req, res) {
  const courseID = req.query["courseID"];
  if (!courseID || courseID.length != 7) {
    res.json(400, { error: "input error" });
    return;
  }
  db.query(
    `SELECT 
    cs.CourseID AS subjectID,
      cs.CName AS subjectName,
      cs.CDesc AS subjectDesc,
      cs.Type AS type,
      cs.Credits AS credits,
      CONCAT('[',group_concat(CONCAT('{"sec":"',cs.Sec,'","teacher":',cs.teacher,',"time":',cs.time,'}')),']') AS detail
  FROM (SELECT 
      cl.CourseID,
      cl.Sec,
      co.CName,
      co.CDesc,
      co.Type,
      co.Credits,
      CONCAT('[',
              GROUP_CONCAT(CONCAT('"',tr.NameTitle,
                          ' ',
                          tr.FName,
                          ' ',
                          tr.LName,'"')),
              ']') AS teacher,
      CONCAT('[',
              GROUP_CONCAT(CONCAT(
              '{"day":"',wur.Day,
              '","time":"',CONCAT(wur.Time,'-',ADDTIME(wur.Time, wur.Duration)),
              '","roomID":"',wur.RoomID,
              '","buildingID":"',wur.BuildingID,'"}')),
              ']') AS time
  FROM
      class AS cl,
      course AS co,
      weeklyuseroom AS wur,
      teach AS t,
      teacher AS tr
  WHERE
      cl.courseID = ?
          AND cl.courseID = co.courseID
          AND cl.courseID = wur.courseID
          AND cl.Sec = wur.Sec
          AND cl.Sem = wur.Sem
          AND cl.Year = wur.Year
          AND cl.courseID = t.courseID
          AND cl.Sec = t.Sec
          AND cl.Sem = t.Sem
          AND cl.Year = t.Year
          AND t.TeacherID = tr.TeacherID
  GROUP BY cl.courseID , cl.Sec , cl.Sem , cl.Year) cs
  GROUP BY cs.courseID`,
    [courseID],
    function(error, results, fields) {
      if (error) {
        res.json(400, { error: error });
        return;
      } else {
        //TODO reformat
        results = results.map(result => {
          result["detail"] = JSON.parse(result["detail"]);
          return result;
        });
        res.json({ data: results });
      }
    }
  );
});

app.get("/allStudents", function(req, res) {
  const teacherID = req.query["teacherID"];
  if (!teacherID || teacherID.length != 10) {
    res.json(400, { error: "input error" });
    return;
  }
  db.query(
    `SELECT 
        StudentID AS studentID,
        CONCAT(NameTitle, ' ', FName, ' ', LName) AS studentName
    FROM
        university.student
    WHERE
        AdvicerID = ?`,
    [teacherID],
    function(error, results, fields) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ data: results });
      }
    }
  );
});

app.get("/studentCourse", function(req, res) {
  const studentID = req.query["studentID"];
  if (!studentID || studentID.length != 10) {
    res.json(400, { error: "input error" });
    return;
  }
  const semester = getCurrentSemester();
  db.query(
    `SELECT 
    class2.CourseID AS courseID,
    c.CName AS courseName,
    class2.Sec AS sec,
    class2.BuildingID AS buildingID,
    class2.RoomID AS roomID,
    class2.Day AS day,
    class2.Time AS startTime,
    class2.Duration AS duration
FROM
(SELECT 
    class.CourseID,
    class.Sec,
    wur.BuildingID,
    wur.RoomID,
    wur.Day,
    wur.Time,
    wur.Duration
FROM
    (SELECT 
        CourseID, Sec, Sem, Year
    FROM
        university.study
    WHERE
        StudentID = ? AND
        Sem = ? AND
        Year = ?) AS class
        LEFT JOIN
    university.weeklyuseroom AS wur ON class.CourseID = wur.CourseID) AS class2
    join university.course AS c on class2.CourseID = c.CourseID`,
    [studentID, semester.sem, semester.year],
    function(error, results, fields) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ data: results });
      }
    }
  );
});

app.post("/register", function(req, res) {
  if (!req.body["courseID"] || !req.body["sec"] || !req.body["studentID"]) {
    res.json(400, { error: "input error" });
    return;
  }
  const semester = getCurrentSemester();
  db.query(
    `INSERT INTO study(CourseID, Sec, Sem, Year, StudentID) VALUES ?`,
    [
      [
        [
          req.body["courseID"],
          req.body["sec"],
          semester.sem,
          semester.year,
          req.body["studentID"]
        ]
      ]
    ],
    function(error, results, fields) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ success: results });
      }
    }
  );
});

app.get("/teacherCourse", function(req, res) {
  const teacherID = req.query["teacherID"];
  if (!teacherID || teacherID.length != 10) {
    res.json(400, { error: "input error" });
    return;
  }
  const semester = getCurrentSemester();
  db.query(
    `SELECT 
        CourseID AS courseID,
        Sec AS sec
    FROM
        university.teach
    WHERE
        TeacherID = ?
        AND Sem = ?
        AND Year = ?`,
    [teacherID, semester.sem, semester.year],
    function(error, results, fields) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ data: results });
      }
    }
  );
});

app.get("/courseAllStudent", function(req, res) {
  const courseID = req.query["courseID"];
  const sec = req.query["sec"];
  if (!courseID || courseID.length != 7 || !sec) {
    res.json(400, { error: "input error" });
    return;
  }
  const semester = getCurrentSemester();
  db.query(
    `SELECT 
        StudentID AS studentID,
        Grade AS grade
    FROM
        university.study
    WHERE
        CourseID = ?
        AND Sec = ?
        AND Sem = ?
        AND Year = ?`,
    [courseID, sec, semester.sem, semester.year],
    function(error, results, fields) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ data: results });
      }
    }
  );
});

app.put("/grade", function(req, res) {
  if (
    !req.body["courseID"] ||
    !req.body["sec"] ||
    !req.body["studentID"] ||
    !req.body["grade"]
  ) {
    res.json(400, { error: "input error" });
    return;
  }
  const semester = getCurrentSemester();
  db.query(
    `UPDATE study SET Grade = ?
    WHERE CourseID = ?
      AND Sec = ?
      AND Sem = ?
      AND Year = ?
      AND StudentID = ?`,
    [
      req.body["grade"],
      req.body["courseID"],
      req.body["sec"],
      semester.sem,
      semester.year,
      req.body["studentID"]
    ],
    function(error, results, fields) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ success: results });
      }
    }
  );
});

app.listen(port, function() {
  console.log("Starting node.js on port " + port);
});
