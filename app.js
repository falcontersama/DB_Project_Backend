const app = require("express")();
const bodyParser = require("body-parser");
const morgan = require("morgan");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(morgan("combined"));

const port = process.env.PORT || 3000;

const db = require("./db");

app.get("/listCourses", function(req, res) {
  const courseID = req.query["courseID"];
  if (!courseID || courseID.length > 7) {
    res.send(400, "courseID is not valid.");
    return;
  }
  //check semseter

  db.query(
    `SELECT DISTINCT
    co.courseID AS subjectID, 
    co.CName AS subjectName
FROM
    class AS cl,
    course AS co
WHERE
    cl.courseID LIKE ?
        AND cl.courseID = co.courseID`,
    [courseID + "%"],
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
    res.send(400, "courseID is not valid.");
    return;
  }
  //check semseter

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

app.get("/studentCourse", function(req, res) {
  const studentID = req.query["studentID"];
  if (!studentID || studentID.length != 10) {
    res.send(400, "studentID is not valid.");
    return;
  }
  db.query(
    `SELECT 
    cs.CourseID,
      cs.CName,
      cs.CDesc,
      cs.Grade,
      cs.Type,
      cs.Credits,
      group_concat(CONCAT('{"sec":"',cs.Sec,'","teacher":',cs.teacher,',"time":',cs.time,'}')) AS detail
  FROM (SELECT 
      cl.CourseID,
      cl.Sec,
      cl.Sem,
      cl.Year,
      cl.Grade,
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
      study AS cl,
      course AS co,
      weeklyuseroom AS wur,
      teach AS t,
      teacher AS tr
  WHERE
      cl.StudentID = ?
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
    [studentID],
    function(error, results, fields) {
      if (error) res.json(400, { error: error });
      else {
        results = results.map(result => {
          result["detail"] = JSON.parse(result["detail"]);
          return result;
        });
        res.json({ data: results });
      }
    }
  );
});

app.listen(port, function() {
  console.log("Starting node.js on port " + port);
});
