# DB_Project_Backend
Project in Database Management Class (Backend)

## config db.js
Please edit `db-example.js` follow this and save it as `db.js`.
```javascript
const connection = mysql.createConnection({
  host: /*your host url*/,
  user: /*your host username*/,
  password: /*your host password*/,
  database: /*your database name*/
});
```

## Request & Response Examples

### GET `/listCourses?courseID=[id]`
response
```
{
    "data": [
        {
            "subjectID": "1234567",
            "subjectName": "test"
        }
    ]
}
```

### GET `/courseDetail?courseID=[id]`
response
```
{
    "data": [
        {
            "subjectID": "1234567",
            "subjectName": "test",
            "subjectDesc": "test1234",
            "type": "reg",
            "credits": 3,
            "detail": [
                {
                    "sec": "1",
                    "teacher": [
                        "T. teacher teacherL"
                    ],
                    "time": [
                        {
                            "day": "TUE",
                            "time": "08:00:00-11:00:00",
                            "roomID": "1",
                            "buildingID": "1"
                        }
                    ]
                },
                {
                    "sec": "21",
                    "teacher": [
                        "T. teacher teacherL"
                    ],
                    "time": [
                        {
                            "day": "MON",
                            "time": "08:00:00-11:00:00",
                            "roomID": "2",
                            "buildingID": "2"
                        }
                    ]
                }
            ]
        }
    ]
}
```

### GET `/studentCourse?studentID=[id]`
response
```
{
    "data": [
        {
            "subjectID": "1234567",
            "subjectName": "test",
            "subjectDesc": "test1234",
            "grade": 4,
            "type": "reg",
            "credits": 3,
            "detail": {
                "sec": "1",
                "teacher": [
                    "T. teacher teacherL"
                ],
                "time": [
                    {
                        "day": "TUE",
                        "time": "08:00:00-11:00:00",
                        "roomID": "1",
                        "buildingID": "1"
                    }
                ]
            }
        }
    ]
}
```