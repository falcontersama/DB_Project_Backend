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

app.post("/login", function(req, res) {
  if (!req.body["ID"]) {
    res.json(400, { error: "input error" });
    return;
  }
  db.query(
    `SELECT StudentID AS ID,Password
  FROM student
  WHERE StudentID = ?
  UNION
  SELECT TeacherID,Password
  FROM teacher
  WHERE TeacherID = ?`,
    [req.body["ID"], req.body["ID"]],
    function(err, results) {
      if (results.length > 0) {
        if (req.body["password"] === results[0]["Password"]) {
          res.json(200, { staus: "success" });
        } else {
          res.json(200, { staus: "fail" });
        }
      } else {
        res.json(200, { staus: "fail" });
      }
    }
  );
});

app.get("/listCourses", function(req, res) {
  const courseID = req.query["courseID"] || "";
  const courseName = req.query["courseName"] || "";
  const isGened = req.query["isGened"];
  if ((courseID.length < 3 || courseID.length > 7) && courseName.length < 3) {
    res.json(400, { error: "input error" });
    return;
  }
  let genquery = "";
  if (isGened === "T") {
    genquery = "Gened%";
  }
  const semester = getCurrentSemester();

  db.query(
    `SELECT DISTINCT
    co.courseID AS subjectID, 
    co.CName AS subjectName,
    (SELECT 
      CONCAT('[',IFNULL(GROUP_CONCAT((CONCAT(
      '{"courseID":"',rq.RqCID,
      '","type":"',rq.Type,
           '"}'))),''),
      ']')
    FROM
      university.requisite AS rq
    WHERE
      rq.CourseID = cl.CourseID) AS requisite
FROM
    class AS cl
    JOIN course AS co ON cl.CourseID = co.CourseID
WHERE
    cl.Sem = ? AND cl.Year = ? 
        AND cl.courseID LIKE ?
        AND co.CName LIKE ?
        AND co.Type LIKE ?`,
    [semester.sem, semester.year, courseID + "%", courseName + "%", genquery],
    function(error, results) {
      if (error) res.json(400, { error: error });
      else {
        results = results.map(result => {
          result["requisite"] = JSON.parse(result["requisite"]);
          return result;
        });
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
  const semester = getCurrentSemester();
  db.query(
    `SELECT 
    course.CourseID AS subjectID,
    course.CName AS subjectName,
    course.CDesc AS subjectDesc,
    course.Type AS type,
    course.Credits AS credits,
    (SELECT 
      CONCAT('[',IFNULL(GROUP_CONCAT((CONCAT(
      '{"courseID":"',rq.RqCID,
      '","type":"',rq.Type,
           '"}'))),''),
      ']')
    FROM
      university.requisite AS rq
    WHERE
      rq.CourseID = class.CourseID) AS requisite,
    CONCAT('[',GROUP_CONCAT(CONCAT(
      '{"sec":',Sec,
      ',"maxSeat":',MaxSeat,
      ',"seat":',AvailableSeat,
      ',"time":',
          (SELECT 
              CONCAT('[',IFNULL(GROUP_CONCAT(CONCAT(
                '{"day":"',Day,
                '","time":"',CONCAT(Time, '-', ADDTIME(Time, Duration)),
                '","roomID":"',RoomID,
                '","buildingID":"', BuildingID,
                '"}')),
               ''),']')
          FROM
              university.weeklyuseroom
          WHERE
              CourseID = class.CourseID
                AND Sec = class.Sec
                AND Sem = class.Sem
                AND Year = class.Year),
      ',"teacher":',
          (SELECT 
              CONCAT('[',IFNULL(GROUP_CONCAT(
                (SELECT 
                  CONCAT('"',NameTitle,' ',FName,' ',LName,'"')
                FROM
                  university.teacher
                WHERE
                  TeacherID = t.TeacherID)),
              ''),']}')
          FROM
              university.teach AS t
          WHERE
              CourseID = class.CourseID
                AND Sec = class.Sec
                AND Sem = class.Sem
                AND Year = class.Year))),
    ']') AS detail
FROM
   university.class AS class
       JOIN
   university.course AS course ON class.CourseID = course.CourseID
WHERE
   class.CourseID = ? AND class.Sem = ?
      AND class.Year = ?
GROUP BY class.CourseID`,
    [courseID, semester.sem, semester.year],
    function(error, results) {
      if (error) {
        res.json(400, { error: error });
        return;
      } else {
        results = results.map(result => {
          result["requisite"] = JSON.parse(result["requisite"]);
          result["detail"] = JSON.parse(result["detail"]);
          return result;
        });
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
  db.query(
    `SELECT 
    course.CourseID AS subjectID,
    course.CName AS subjectName,
    course.CDesc AS subjectDesc,
    course.Type AS type,
    course.Credits AS credits,
    study.Sem AS semester,
    study.Year AS year,
	  study.Sec AS sec,
    (SELECT 
		CONCAT('[',IFNULL(GROUP_CONCAT(CONCAT(
			'{"day":"',Day,
            '","time":"',CONCAT(Time, '-', ADDTIME(Time, Duration)),
            '","roomID":"',RoomID,
			'","buildingID":"',BuildingID,
		'"}')),''),']')
	FROM
        university.weeklyuseroom
	WHERE
        CourseID = study.CourseID
           AND Sec = study.Sec
           AND Sem = study.Sem
           AND Year = study.Year) AS time,
	(SELECT 
		CONCAT('[',IFNULL(GROUP_CONCAT(
			(SELECT 
				CONCAT('"',NameTitle, ' ', FName,' ', LName,'"')
            FROM
                university.teacher
            WHERE
                TeacherID = t.TeacherID)),
        ''),']')
    FROM
        university.teach AS t
    WHERE
		CourseID = study.CourseID
			AND Sec = study.Sec
            AND Sem = study.Sem
            AND Year = study.Year) AS teacher
FROM
    university.study AS study
        JOIN
    university.course AS course ON study.CourseID = course.CourseID
WHERE
    study.StudentID = ?`,
    [studentID],
    function(error, results) {
      if (error) {
        res.json(400, { error: error });
        return;
      } else {
        results = results.map(result => {
          result["time"] = JSON.parse(result["time"]);
          result["teacher"] = JSON.parse(result["teacher"]);
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
    function(error, results) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ data: results });
      }
    }
  );
});

app.get("/studentSchedule", function(req, res) {
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
JOIN 
    university.course AS c ON class2.CourseID = c.CourseID`,
    [studentID, semester.sem, semester.year],
    function(error, results) {
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
    function(error, results) {
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
    function(error, results) {
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
    function(error, results) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ data: results });
      }
    }
  );
});

app.get("/semesterSchedule", function(req, res) {
  const semester = getCurrentSemester();
  db.query(
    `SELECT 
        Semester AS semester,
        Year AS year,
        PayDate AS paydate,
        RegDate AS regdate, 
        DropDate AS dropdate, 
        WithdrawDate AS withdrawdate
    FROM
        semester
    WHERE
        Semester = ? AND Year = ?`,
    [semester.sem, semester.year],
    function(error, results) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ data: results });
      }
    }
  );
});

app.delete("/unregister", function(req, res) {
  if (!req.body["courseID"] || !req.body["sec"] || !req.body["studentID"]) {
    res.json(400, { error: "input error" });
    return;
  }
  const semester = getCurrentSemester();
  db.query(
    `DELETE FROM study 
    WHERE CourseID = ?
      AND StudentID = ?
      AND Sem = ?
      AND Year = ?`,
    [req.body["courseID"], req.body["studentID"], semester.sem, semester.year],
    function(error, results) {
      if (error) res.json(400, { error: error });
      else {
        res.json({ success: results });
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
    function(error, results) {
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
