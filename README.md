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

### GET `/listCourses?courseID=[id]&courseName=[name]&isGened=[T/F]`

response

```
{
    "data": [
        {
            "subjectID": "1234567",
            "subjectName": "test",
            "requisite": []
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
            "requisite": [
                {
                    "courseID":"2102252",
                    "type":"PreReq"
                }
            ],
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
            "subjectID": "0123101",
            "subjectName": "PARAGRAP WRITING",
            "subjectDesc": "PARAGRAPH WRITING",
            "type": "Gened-hu",
            "credits": 3,
            "sec": 1,
            "time": [
                {
                    "day": "MON",
                    "time": "08:00:00-11:00:00",
                    "roomID": "101",
                    "buildingID": "04000"
                },
                {
                    "day": "TUE",
                    "time": "08:00:00-11:00:00",
                    "roomID": "101",
                    "buildingID": "04000"
                }
            ],
            "teacher": [
                "Assist. Prof. Dr. Jessupha Inchareon",
                "Prof. Dr. Kanthee Kantawong"
            ]
        }
    ]
}
```

### GET `/allStudents?teacherID=[id]`

response

```
{
    "data": [
        {
            "studentID": "5208389731",
            "studentName": "Ms. Cacheknock Pyramid"
        },
        {
            "studentID": "5507967031",
            "studentName": "Ms. Valve Software"
        },
        {
            "studentID": "5508955931",
            "studentName": "Mr. Video Chlorophyll"
        }
    ]
}
```

### GET `/studentSchedule?studentID=[id]`

response

```
{
    "data": [
        {
            "courseID": "0123101",
            "courseName": "PARAGRAP WRITING",
            "sec": 1,
            "buildingID": null,
            "roomID": null,
            "day": null,
            "startTime": null,
            "duration": null
        }
    ]
}
```

### POST `/register`

request

```
{
    "courseID":"0123101",
    "sec":1,
    "studentID":"5211067333"
}
```

response

```
{
    "success": {
        ...
    }
}
```

or

```
{
    "error": {
        ...
    }
}
```

### GET `/teacherCourse?teacherID=[id]`

response

```
{
    "data": [
        {
            "courseID": "0123101",
            "sec": 1,
        }
    ]
}
```

### GET `/courseAllStudent?courseID=[id]&sec=[sec]`

response

```
{
    "data": [
        {
            "studentID": "5211067333",
            "grade": 3.5,
        }
    ]
}
```

### PUT `/grade`

request

```
{
    "courseID":"0123101",
    "sec":1,
    "studentID":"5211067333",
    "grade":3.5
}
```

response

```
{
    "success": {
        ...
    }
}
```

or

```
{
    "error": {
        ...
    }
}
```
