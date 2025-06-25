/* 
Подключение библиотек
npm i express express-handlebars passport passport-local express-session express-mysql-session body-parser jsonwebtoken nodemailer cookie-parser morgan mysql smsaero

npm i axios

npm install --save-dev jest
для jest
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

added 266 packages, and audited 267 packages in 40s

32 packages are looking for funding
  run `npm fund` for details



*/
/* 
среды выполнения 
production -- это понятьно
development -- это на локальном сервере
test -- это на боевом серевере в режиме теста

*/

const express = require('express')
  , expressHandlebars = require('express-handlebars')
  , passport = require('passport')
  , LocalStrategy = require('passport-local')
  , crypto = require('crypto')
  , session = require('express-session')
  , MySQLStore = require('express-mysql-session')(session)
  , bodyParser = require('body-parser')
  , db = require('./db')
  , jwt = require('jsonwebtoken')
  , nodemailer = require('nodemailer')
  , cookieParser = require('cookie-parser')
  // , handlers = require('./lib/handlers')
  , smsGenerator = require('./lib/smsGenerator').generator
  , morgan = require('morgan')
  , fs = require('fs')
  , cluster = require('cluster')
  , { SmsAero, SmsAeroError, SmsAeroHTTPError } = require('smsaero')
  , getFunAddTextComment = require('./lib/commonFunctions').getFunAddTextComment
  // , addTextCommentNew = require('./lib/commonFunctions').addTextCommentNew
  , dataForAPI = require('./lib/dataForAPInode')
  , appFileTests = require('./lib/customTests/appFileTests')
  , runTests = require('./lib/commonFunctions').runTests
  , https = require('https') // это может быть использовано, в случае если нужен https без nginx 
  , emailGenerator = require('./lib/emailGenerator').emailGenerator
  , path = require('node:path');

const urlResetPass = 'reset' // это url я вынес в переменную, потому что он используется в двух местах

/* это нужно использовать если нужен будет https без nginx */
// const options = {
//     key: fs.readFileSync(__dirname + '/ssl/blueprint.pem'),
//     cert: fs.readFileSync(__dirname + '/ssl/blueprint.crt'),
// }

const { credentials,
  sessionHost,
  sessionUser,
  sessionPassword,
  sessionDatabase,
  longTokenExpire,
  tokenExpire,
  emailTokenExpire,
  yourEmail,
  domen,
  httpProtocol,
  sessionCookiesExpirationMM,
  cleanConnectionsTime,
  smtpKey,
  smtpHost,
  smtpPort,
  smtpUser,
  loginForSMS,
  keyForSMS,
  deleteSmsTime,
  smsCodeNumberOfCharacters,
  telephoneNumberMax,
  telephoneNumberMin,
  maxLenghtOfUserName,
  cleanSmsCodeTime,
  serverToken,
  deleteEmailCodeTime,
  emailCodeNumberOfCharacters
} = require('./config')


const sessionStore = new MySQLStore(
  {
    host: sessionHost,
    port: 3306,
    user: sessionUser,
    password: sessionPassword,
    database: sessionDatabase,
    expiration: sessionCookiesExpirationMM, /* 
        указывая срок истечения кука явно, для того, чтобы это же точно время можно было использовать для удаления из таблицы с коннектами
        */
  }
)
// YYYY-MM-DD НН:MI:SS
const getTimeForMySQL = (timeStamp) => {
  const getTwoSimbols = (x) => {
    return x > 9 ? x : '0' + x
  }
  const time = new Date(Number(timeStamp))
  const hours = getTwoSimbols(time.getHours())
  const minutes = getTwoSimbols(time.getMinutes())
  const seconds = getTwoSimbols(time.getSeconds())
  const month = getTwoSimbols(time.getMonth() + 1)
  const date = getTwoSimbols(time.getDate())
  return `${time.getFullYear()}-${month}-${date} ${hours}:${minutes}:${seconds}`

}
const getTokenFunction = (params, tokenSecret) => { // pframs -- это объект в котором, элементами являются данные, котороые будут зашифрованы в данной случае { username, usersId, connectionId }
  let message = ''
  if (typeof params !== 'object') {
    message += 'params is not object\n'
  }
  if (typeof tokenSecret !== 'string') {
    message += 'tokenSecren is no string'
  }
  if (message) return console.log(message)
  return (tokenExpire) => {
    if (typeof tokenExpire !== 'number') {
      return console.log('tokenExpire is not number')
    }
    return jwt.sign(params, tokenSecret, { expiresIn: tokenExpire })
  }
}
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Zа-яА-Я0-9._%+-]+@[a-zA-Zа-яА-Я0-9.-]+\.[a-zA-Zа-яА-Я]{2,}$/;
  return emailRegex.test(email);
}
// const deleteExpiredConnections = (db) => {
//     const now = new Date()

//     db.run('UPDATE connections SET delete_ = 1 WHERE delete_ = 0 AND time_ < ?)', [getTimeForMySQL(now.setDate(now.getDate() - 1))], (err, rows) => {
//         if (err) return { result: false, err }
//         return rows.length
//     })
// }
// const setConnections = (db, userAgent, usersId) => {
//     db.run('INSERT INTO connections (user_agent, users_id) VALUES (?, ?)',
//         [userAgent, usersId], (err, rows) => {
//             if (err) return { result: false, err }
//             console.log('данные в базу внесены')
//             return { result: true, connectionsId: rows.lastID }
//         })
// }

// const setConnectionsForWeb = (db, userAgent, usersId, res) => {
//     const recordDBResult = setConnections(db, userAgent, usersId)
//     console.log(recordDBResult)
//     if (recordDBResult.result) return setCookiesIdConnections(res, recordDBResult.connectionsId)
//     return false
// }
const deleteConnection = (db, connectionsId) => {
  db.run('UPDATE connections SET delete_ = 1 WHERE id = ?', [connectionsId], (err, rows) => {
    if (err) return { result: false, err }
    return { result: true }
  })
}
// let updateIntervalId = setInterval(() => {
//     const now = new Date()
//     db.run('UPDATE connections SET delete_ = 1 WHERE delete_ = 0 AND time_ < ?', [getTimeForMySQL(now.setMilliseconds(now.getMilliseconds() - cleanConnectionsTime))], (err, rows) => {
//         if (err) return console.log('err cleanConnecitonsTime')
//     })
// }, cleanConnectionsTime)
// (() => {
let deleteConnections = setInterval(() => {
  const now = new Date()
  const deleteTokenTime = getTimeForMySQL(now.setMilliseconds(now.getMilliseconds() - tokenExpire * 1000))
  const deleteCookeTime = getTimeForMySQL(now.setMilliseconds(now.getMilliseconds() - sessionCookiesExpirationMM))
  db.run('DELETE FROM connections WHERE time_ < ? AND connection_type = ("unknow" OR "token")', [deleteTokenTime], (err, rows) => {
    if (err) return console.log('err delete connections from token')
  })
  db.run('DELETE FROM connections WHERE time_ < 2 AND connection_type = "cookie"', [deleteCookeTime], (err, rows) => {
    if (err) return console.log('err delete connections from cookie')
  })
}, cleanConnectionsTime)
// })() // раз в сутки удаляем все соединения старше 30 дней


// const usernameForWeb = (req, res) => {
//     let username
//     if (req.user) {
//         username = req.user.username
//         if (req.signedCookies.connectionId === undefined) {
//             setConnectionsForWeb(db, req.headers['User-Agent'], req.user.username, res)
//         }
//     } else {
//         username = 'Не актуализирован'
//     }
//     return username
// }

const forSignupAPI = (req, res, next, db, usersId) => {
  const userAgent = req.headers['user-agent'] ?? 'Unknown'
  db.run('INSERT INTO connections (user_agent, users_id) VALUES (?, ?)',
    [userAgent, usersId], (err, rows) => {
      if (err) return res.status(500).json({ request: 'error', message: err.message })

      // const   username = req.body.username, 
      //         connectionId = rows.insertId
      // const getToken = (tokenExpire) => {
      //     return jwt.sign({ username, usersId, connectionId }, credentials.tokenSecret, { expiresIn: tokenExpire })
      // } // еще не доделан
      // const username = req.body.username
      // const connectionId = rows.insertId
      const params = { username: req.body.username, usersId, connectionId: rows.insertId }
      // const token = jwt.sign({ username, usersId, connectionId }, credentials.tokenSecret, { expiresIn: tokenExpire })
      // const longToken = jwt.sign({ username, usersId, connectionId }, credentials.longTokenSecret, { expiresIn: longTokenExpire })
      res.status(200).json({
        request: 'good',
        message: 'You are registered',
        token: getTokenFunction(params, credentials.tokenSecret)(tokenExpire),
        longToken: getTokenFunction(params, credentials.longTokenSecret)(longTokenExpire)
      })
    }
  )
}
const forResAPI = (req, res, next, db, userId, username) => {
  const userAgent = req.headers['user-agent'] ?? 'Unknown'
  db.run('INSERT INTO connections (user_agent, users_id) VALUES (?, ?)',
    [userAgent, userId], (err, rows) => {
      if (err) return res.status(500).json({ request: 'error', message: err.message })
      const params = { username, userId, connectionId: rows.insertId }
      res.status(200).json({
        request: 'good',
        message: 'You are registered',
        token: getTokenFunction(params, credentials.tokenSecret)(tokenExpire),
        longToken: getTokenFunction(params, credentials.longTokenSecret)(longTokenExpire)
      })
    }
  )
}
const forGETRenderOther = (page) => {
  return (req, res, next) => {
    res.render(page, {
      username: (function (req, res) {
        let username
        if (req.user) {
          username = req.user.username
          db.run('SELECT * FROM users WHERE username = ?', [username], (err, rows) => {
            if (err) return next()
            if (rows.length !== 1) return next()
            if (!req.signedCookies.connectionId) {
              (function (db, userAgent, usersId) {
                db.run('INSERT INTO connections (user_agent, users_id) VALUES (?, ?)', [userAgent, usersId], (err, rows) => {
                  if (err) return next(err)
                    (function (res, connectionsId) {
                      return res.cookie('connectionId', connectionsId, { signed: true, maxAge: sessionCookiesExpirationMM })
                    })
                })
              })
            }
          })
        }
      })
    })
  }
}
/* 
req.headers

{
  host: 'localhost:3000',
  'user-agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
  accept: '',
  'accept-language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
  'accept-encoding': 'gzip, deflate, br',
  connection: 'keep-alive',
  cookie: 'connect.sid=s%3A-YzSZTXLGrtnePTQoFOEKMn3k5a4OiCu.OM2THYFtcJT7XsYlNWXd2o39hcKkZPM6uwMdYzl24a0',
  'upgrade-insecure-requests': '1',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  pragma: 'no-cache',
  'cache-control': 'no-cache'
}

*/

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: true,
  auth: {
    user: smtpUser,
    pass: smtpKey,
  },
});
// transporter.verify(function (error, success) {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log("Server is ready to take our messages");
//     }
//   });
// Middleware для проверки токена
const authenticateToken = (req, res, next) => { // эта фукнция и фукнция authenticateLongToken очень похожи --- отличаются только req.body.token и credentials.tokenSecret. поэтому лучше эти функции получать через одну функцию
  const token = req.body.token;
  if (!token) {
    return res.status(401).json({ request: 'error', message: 'Unauthorized: Token missing' });
  }

  jwt.verify(token, credentials.tokenSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ request: 'error', message: 'Unauthorized: Invalid token' });
    }

    req.user = decoded;
    // console.log(decoded) // { username: 'vasa', iat: 1707980883, exp: 1710572883 } я еще добавил другое свойство 
    next();
  });
};
const authenticateLongToken = (req, res, next) => {
  const token = req.body.longToken;
  if (!token) {
    return res.status(401).json({ request: 'error', message: 'Unauthorized: Token missing' });
  }

  jwt.verify(token, credentials.longTokenSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ request: 'error', message: 'Unauthorized: Invalid token' });
    }

    req.user = decoded;
    // console.log(decoded) // { username: 'vasa', iat: 1707980883, exp: 1710572883 } я еще добавил другое свойство 
    next();
  });
}

// __dirname --- это текущая папка
const app = express()

let fakeTel
switch (app.get('env')) {
  case 'production':
    fakeTel = '79601302040'
    break;
  default:
    fakeTel = '79601302040'
}

app.use(express.static(__dirname + '/public'))

const port = process.env.PORT ?? 3000
switch (app.get('env')) {
  case 'development':
    app.use(require('morgan')('dev'));
    break;
  case 'test':
    app.use(require('morgan')('dev'));
    break;
  case 'production':
    const stream = fs.createWriteStream(__dirname + '/access.log', // файл access.log создается сам
      { flags: 'a' })
    app.use(morgan('combined', { stream }))
    break
}
const eppressHandlebarObj = expressHandlebars.create({
  defaultLayout: 'main'
})
const projectSymbolName = Symbol('Project name')
// getTimeForMySQL(now.setDate(now.getDate() - 1))
// getMilliseconds()
// getTimeForMySQL(now.setMinutes(now.getMinutes() - 1))


app.use((req, res, next) => {
  if (cluster.isWorker)
    console.log(`Worker ${cluster.worker.id} received request`)
  next()
})
app.use((req, res, next) => { // генерируем объкт с кастомными данными в объекте req, это будет нужно для того чтобы передавать что-то свое
  req[projectSymbolName] = {},
    next()
})
// app.use((req, res, next) => { // пока не удаляю, но надо будет кдалить
//     deleteExpiredConnections(db)
//     next()
// })
/*
Это пример его использования 
app.use((req, res, next) => {
    req[projectSymbolName]['cookiesAgree'] = (req.cookies.agree === 'yes')
    next()
})
*/
app.use(cookieParser(credentials.cookieSecret))

app.use(express.json())

app.engine('handlebars', eppressHandlebarObj.engine)

app.set('view engine', 'handlebars')

const strategy = new LocalStrategy(function verify(username, password, cb) {
  db.run('SELECT * FROM users WHERE username = ?', [username], function (err, user) {
    if (err) { return cb(err); }
    if (0 === user.length) { return cb(null, false, { message: 'Incorrect username or password.' }); }

    crypto.pbkdf2(password, user[0].salt, 310000, 32, 'sha256', function (err, hashedPassword) {
      if (err) { return cb(err); }
      if (!crypto.timingSafeEqual(user[0].hashed_password, hashedPassword)) {
        return cb(null, false, { message: 'Incorrect username or password.' });
      }
      return cb(null, user[0])
    });
  });
});
passport.use(strategy)
// passport.use(new LocalStrategy(function verify(username, password, cb) {
//     db.run('SELECT * FROM users WHERE username = ?', [username], function (err, row) {
//         if (err) { return cb(err); }
//         if (row.length === 0) { return cb(null, false, { message: 'Incorrect username or password.' }); }

//         crypto.pbkdf2(password, row.salt, 310000, 32, 'sha256', function (err, hashedPassword) {
//             if (err) { return cb(err); }
//             if (!crypto.timingSafeEqual(row.hashed_password, hashedPassword)) {
//                 return cb(null, false, { message: 'Incorrect username or password.' });
//             }
//             return cb(null, row);
//         });
//     });
// }));
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
app.use(session({
  secret: credentials.cookieSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
}));
// app.use(passport.authenticate('session')); // c этим все работало
app.use(bodyParser.urlencoded({ extended: true }))

// app.get('/', passport.authenticate('session'), handlers.homeGet)

// app.get('/login', passport.authenticate('session'), handlers.loginGet)
// app.post('/login/password', passport.authenticate('local', {
//     successRedirect: '/',
//     failureRedirect: '/login'
// }));
// let username = req.user ? req.user.username : 'Не актуализирован'
// app.post('/login/password', passport.authenticate('local', { failureRedirect: '/login' }), handlers.loginPasswordPost)
/* 
Это то что в req.user
Похоже полностью повторяет то, что хранистя в БД
{
  id: 54,
  username: 'Jora',
  hashed_password: <Buffer 9a e5 60 61 8e 84 b5 c6 af af 54 eb df 82 f3 e4 a4 c0 f5 ca f2 0d 8b e5 64 e2 ad b1 fd 3f 13 eb>,
  salt: <Buffer b2 66 bc 58 99 3c 30 bd 40 5a 9b ef 40 06 c2 6d>,
  email: 'websagan@gmail.com',
  email_verified: 0,
  time_: 2024-03-13T15:10:14.000Z,
  delete_: 0
}
*/
// app.post('/logout', passport.authenticate('session'), handlers.logoutPost)

// app.get('/signup', passport.authenticate('session'), handlers.signupGet)
/* 
Вот что сохраняется в БД в таблице sessions

при регистрации пользователя из браузера в таблице сохраняется вот что:
поле session_id значение ftD4GbkuWRR1wuLqmFK3EMaGe-hl_Hx0
поле expires значение 1712824333
поле data значение {"cookie":{"originalMaxAge":null,"expires":null,"httpOnly":true,"path":"/"},"passport":{"user":{"username":"Jora"}}}

когда же мы выходим из сессии т.е нажимаем вызываем запрос post /logout то в БД видим вот это
поле session_id значение g-v8Zk4HWkZLhpDQtZIb6SNBmQLEGSuH
поле expires значение 1712824434
поле data значение {"cookie":{"originalMaxAge":null,"expires":null,"httpOnly":true,"path":"/"}} 
Вывод: когда пользователь выходит из логирования то в таблице перезаписывается запись, в ней меняется все, но в поле data запись немного похожа, но отсутсвует поле passport

Когда же мы снова залогиниваемя то в таблице вот что хранится:
поле session_id значение 65SC6siekbNzPyD-d5Pf0KPlh4N1Rgh3
поле expires значение 1712824477
поле data значение {"cookie":{"originalMaxAge":null,"expires":null,"httpOnly":true,"path":"/"},"passport":{"user":{"id":56,"username":"Jora"}}}
Вывод: когда пользователь снова залогинивается, то запись снова перезаписывается, перезаписываются все поля, а в поле data  немного похожа, но в поле passport.user добавилось свойство id

Главный вывод, котороый делаю -- один пользователь с одного браузера помечается одной записью. 

*/
/* 
router.post('/signup', function(req, res, next) {
  var salt = crypto.randomBytes(16);
  crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', function(err, hashedPassword) {
    if (err) { return next(err); }
    db.run('INSERT INTO users (username, hashed_password, salt) VALUES (?, ?, ?)', [
      req.body.username,
      hashedPassword,
      salt
    ], function(err) {
      if (err) { return next(err); }
      var user = {
        id: this.lastID,
        username: req.body.username
      };
      req.login(user, function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
    });
  });
});

*/
// app.post('/signup', passport.authenticate('session'), handlers.signupPost)
/* 
rows INSERT

OkPacket {
  fieldCount: 0,
  affectedRows: 1,
  insertId: 43,
  serverStatus: 2,
  warningCount: 0,
  message: '',
  protocol41: true,
  changedRows: 0
}

*/
/* 
rows UPDATE

OkPacket {
  fieldCount: 0,
  affectedRows: 1,
  insertId: 0, // это не тот id под которым запись находится в БД
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 1  Changed: 1  Warnings: 0',
  protocol41: true,
  changedRows: 1
}
*/

/* 
когда мы делаем выборку SELECT * FROM sometable, а данная таблица пуста, то функции-callback, которая идет третьим агрументом в db.run, в качестве второго аргумента, который мы часто "обзываем" здесь rows или как-то иначе, идет пустой массив []  
*/
/* 
Если в таблице поле помечается unique то при попытке записать в это поле дублирующий контент, параметру err будет передана объект ошибки:
{
"code":"ER_DUP_ENTRY",
"errno":1062,
"sqlMessage":"Duplicate entry 'roma' for key 'table2.table2_some'",
"sqlState":"23000",
"index":0,
"sql":"INSERT INTO table2 (table2_some) VALUE ('roma')"}
}
Значене "roma" уже присутствовало в таблице
*/

let smsCodeCleanId = setInterval(() => {
  const now = new Date()
  const req = `DELETE FROM smscodes WHERE smscode_timeLastAttempt < '${getTimeForMySQL(now.setMilliseconds(now.getMilliseconds() - cleanSmsCodeTime))}'`
  db.run(req, [], (err, rows) => {
    if (err) return console.log('err cleanSmsCode', err)
  })
}, cleanSmsCodeTime)

let emailCodeCleanId = setInterval(() => {
  const now = new Date()
  const req = `DELETE FROM emailidentificationсodes WHERE emailidentificationсode_timeLastAttempt < '${getTimeForMySQL(now.setMilliseconds(now.getMilliseconds() - deleteEmailCodeTime))}'`
  db.run(req, [], (err, rows) => {
    if (err) return console.log('err cleanSmsCode', err)
  })
}, deleteEmailCodeTime)

let addTextInComment = getFunAddTextComment(app)

// let addTextCommentNew = (app, text) => {
//     const env = app.get('env')
//     // console.log('text --- ', text)
//     if (env === 'test' || env === 'development') {
//         let ret = ` -- ${text}`
//         // console.log('ret --- ', ret)
//         return ret
//     }
//     return ''
// }
let deleteDiscriptionRus = response => {
  delete response.discriptionRus
  return response
}
let getResponseJSON = (responseCode, comment) => {
  if (!comment) comment = ''
  let putComment = response => {
    let com = addTextInComment(comment)
    response.description = `${response.description}${com}`
    return response
  }
  let getResponseObj = (obj) => {
    return JSON.parse(JSON.stringify(obj))
  }
  if (!responseCode || typeof responseCode !== 'string') {
    return deleteDiscriptionRus(putComment(getResponseObj(dataForAPI.universalResponses)))
  }
  for (let elem of dataForAPI.responses) {
    if (elem.responseCode === responseCode) {
      let ret = deleteDiscriptionRus(putComment(getResponseObj(elem)))
      return ret
    }
  }
}

/* objOwnerId = {id, toDeleteOwner}
example {id: insertOwnersRows.insertId, toDeleteOwner: true } {id: selectOwnersRows[0].owner_id, toDeleteOwner: false } */
let makeConnectionUpdateUsersReturnJSON = (req, res, next, db, getResponseJSON, addTextInComment, getTokenFunction, userId, credentials, tokenExpire, longTokenExpire, userName, objOwnerId, status) => {
  let returnedValue = 'unchanged' // это для тестирования
  const userAgent = req?.headers['user-agent'] ?? 'Unknown'
  const ownerId = objOwnerId.id
  const deleteOwner = () => {
    if (objOwnerId.toDeleteOwner) db.run('DELETE FROM owners WHERE owner_id = ?', [ownerId])
  }
  db.run('INSERT INTO connections (connection_userAgent, user_id, connection_type) VALUES (?, ?, ?)', [userAgent, userId, 'token'], (err, insertConnectionsRows) => {
    if (err) {
      console.log(err)
      deleteOwner()
      let return0001003_1 = getResponseJSON("0001003", 'ощибка БД INSERT INTO connections (connection_userAgent, user_id) VALUES (?, ?)')
      res.status(200).json(return0001003_1)
      return returnedValue = return0001003_1 // это для тестирования
      // 'возврат ошибки при попытке ввести connections"
    }
    const connectionId = insertConnectionsRows.insertId
    const params = { userId, connectionId }
    const accessToken = getTokenFunction(params, credentials.tokenSecret)(tokenExpire)
    const refreshToken = getTokenFunction(params, credentials.longTokenSecret)(longTokenExpire)
    db.run('SELECT connection_userAgent, connection_id FROM connections WHERE user_id = ?', [userId], (err, selectConnectionsUserID) => {
      if (err) {
        let return0001003_3 = res.status(200).json(getResponseJSON('0001003', 'ошибка БД SELECT connection_userAgent, connection_id FROM connections WHERE user_id = ?'))
        return returnedValue = return0001003_3
      }
      /* 
      "connectedUserAgent": [
      {
          "connectedId": 0,
          "connectedUserAgentName": ""
      }
      ],
      */
      const connectedUserAgent = []
      selectConnectionsUserID.forEach(elem => {
        connectedUserAgent.push({
          connectedId: elem.connection_id,
          connectedUserAgentName: elem.connection_userAgent
        })
      })
      let return0040000 = {
        ...getResponseJSON("0040000"),
        ...{
          accessToken,
          refreshToken,
          ownerId,
          userId,
          connectedUserAgent,
          status,
          userName
        }
      }
      if (userName) {
        db.run('UPDATE users SET user_name = ? WHERE user_id = ?', [userName, userId], (err, updateUsersRows) => {
          if (err) {
            deleteOwner()
            db.run('DELETE FROM connectons WHERE connection_id = ?', [connectionId])
            // console.log('this is addedText', addedText)
            let return0001003_2 = getResponseJSON(`0001003`, 'ощибка БД UPDATE users SET user_name = ? WHERE user_id = ?')
            res.status(200).json(return0001003_2)
            return returnedValue = return0001003_2 // это для тестирования
            // 'возврат ошибки при попытке обновить user_name при userName заполненном'
          }

        })
        res.status(200).json(return0040000)
        return returnedValue = return0040000 // это для тестирования
        // 'возрат токено при userName заполненном'
      } else {
        res.status(200).json(return0040000)
        return returnedValue = return0040000 // это для тестирования
        // 'возрат токенов при userName пустом'
      }

    })
  })
  return returnedValue // это для тестирования
}

// это тесты
if (app.get('env') === 'test') {
  let appFileTests = require('./lib/customTests/appFileTests')
  let { runTests } = require('./lib/commonFunctions')
  runTests(app,

    { fun: appFileTests.deleteDiscriptionRusTest, paramArr: [dataForAPI.responses, deleteDiscriptionRus] },

    { fun: appFileTests.getResponseJSONTest, paramArr: [dataForAPI.responses, getResponseJSON] },

    { fun: appFileTests.addTextInCommentTest, paramArr: [app, addTextInComment] },

    { fun: appFileTests.makeConnectionUpdateUsersReturnJSONtest, paramArr: [getResponseJSON, addTextInComment, getTokenFunction, credentials, tokenExpire, longTokenExpire, makeConnectionUpdateUsersReturnJSON] },
  )
}
function ifGetCheckGooqlePlay() {
  db.run('INSERT INTO checkGoogleCome () VALUE ()', [], (err, insertUsersRows) => { })
}
app.get('/confident', (req, res, next) => {
  res.render('confident', { layout: null })
})
app.get('/deleteAccount', (req, res, next) => {
  res.render('deleteAccount', { layout: 'deleteAccount', message: null })
})
app.post('/deleteAccount', (req, res, next) => {
  console.log(next)
  // req.body { tel: '79001234567' }
  const tel = req.body?.tel
  let message = ''
  if (tel?.length !== 11) message += 'В номере телефона должно быть 11 символов. Включая код страны и код оператора<br>'
  if (isNaN(Number(tel))) message += 'В номере телефона не все символы цифры<br>'
  if (message) return res.render('deleteAccount', { layout: 'deleteAccount', message })
  db.run('SELECT * FROM telephones WHERE telephone_number = ? AND delete_ = 0', [tel], (err, selectTelephonesRows) => {
    if (err) return res.render('deleteAccount', { layout: 'deleteAccount', message: "Что-то пошло не так!1" })
    if (!selectTelephonesRows.length) return res.render('deleteAccount', { layout: 'deleteAccount', message: `Учетной записи, ассоциированной с телефонным номером ${tel}, не обнаружено.` })
    // UPDATE connections SET delete_ = 1 WHERE id = ?
    db.run('UPDATE users SET delete_ = 1 WHERE user_id = ?', [selectTelephonesRows[0]['user_id']], (err, updateUsersRows) => {
      if (err) return res.render('deleteAccount', { layout: 'deleteAccount', message: "Что-то пошло не так!2" })
      db.run('UPDATE telephones SET delete_ = 1 WHERE user_id = ?', [selectTelephonesRows[0]['user_id']], (err, updateTelephonesRows) => {
        if (err) return res.render('deleteAccount', { layout: 'deleteAccount', message: "Что-то пошло не так!3" })
        db.run('UPDATE owners SET delete_ = 1 WHERE user_id = ?', [selectTelephonesRows[0]['user_id']], (err, updateOwnersRows) => {
          if (err) return res.render('deleteAccount', { layout: 'deleteAccount', message: "Что-то пошло не так!4" })
          return res.render('deleteAccount', { layout: 'deleteAccount', message: `Учетная запись, ассоциированная с телефонным номером ${tel}, удалена!.` })
        })
      })
    })
  })
})
// app.get('/checkSQL', (req, res, next) => {
/* 
таким будет вид объекта если не использовать синонимы в запросе
*/
//     [
//   RowDataPacket {
//     owner_id: 1,
//     user_id: 1,
//     comment_: null,
//     time_: 2025-05-22T10:55:35.000Z,
//     delete_: 0,
//     user_name: null
//   }
// ]

/* 
Если синонимы использовать то все работает хорошо
[
  RowDataPacket {
    oowner_id: 1,
    ouser_id: 1,
    ocomment_: null,
    otime_: 2025-05-22T10:56:05.000Z,
    odelete_: 0,
    uuser_name: null,
    ucomment_: null,
    utime_: 2025-05-22T10:55:35.000Z,
    udelete_: 0
  }
]


*/

//     const userId = 1
//     db.run("SELECT o.owner_id AS oowner_id, o.user_id AS ouser_id , o.comment_ AS ocomment_ , o.time_ AS otime_, o.delete_ AS odelete_, u.user_name AS uuser_name, u.comment_ AS ucomment_ , u.time_ AS utime_, u.delete_ AS udelete_ FROM owners o INNER JOIN users u ON o.user_id = u.user_id WHERE o.user_id = ?", [userId], (err, selectOwnersRows) => {
//         if (err) return console.log('error')
//         console.log(selectOwnersRows)
//         res.status(200).json({'lkjlkj': 'kljlkj'})
//     }
//     )
// })
// /api/getSMSCodeForRegistrationByTelephone
app.post('/api/getSMSCodeForRegistrationByTelephone', (req, res, next) => {
  const body = req?.body, telephoneNumber = body?.telephoneNumber
  if (!telephoneNumber) return res.status(400).json(getResponseJSON("0001000"))
  // так как в дальнейшем номер телефона потребуется именно в виде строки, то в число преорбазовываю только в нужных местах
  const telephoneNumberLength = telephoneNumber.length
  if (isNaN(Number(telephoneNumber)) || (telephoneNumberLength < telephoneNumberMin || telephoneNumberLength > telephoneNumberMax)) return res.status(200).json(getResponseJSON("0001002"))

  db.run('SELECT * FROM telephones WHERE telephone_number = ?', [telephoneNumber], (err, selectTelephonesRows) => {
    // [] -- данное значение имеет selectTelephonesRows если в базе ничего не найдено
    if (err || selectTelephonesRows.length > 1) return res.status(200).json(getResponseJSON('0001003', 'ошибка БД SELECT * FROM telephones WHERE telephone_number = ?'))
    if (!selectTelephonesRows.length) { // это означает, что ранее не было НИ ОДНОГО запроса для этого номера телефона, поэтому можно ничего не проверять
      db.run('INSERT INTO users () VALUE ()', [], (err, insertUsersRows) => {
        if (err) return res.status(200).json(getResponseJSON("0001003", 'ошибка БД INSERT INTO users () VALUE ()'))
        const userId = insertUsersRows.insertId
        db.run('INSERT INTO telephones (telephone_number, user_id) VALUES (?, ?)', [telephoneNumber, userId], (err, insertTelephoneRows) => {
          /* проверка err?.code === "ER_DUP_ENTRY" нужна для того, чтобы исключить создание мусорных user-ов, в случае, когда во время одного запроса к БД, другой запрос успел создать учетную записи. Такое возможно в асинхронном коде  */
          if (err?.code === "ER_DUP_ENTRY") {
            db.run('DELETE FROM users WHERE user_id = ?', [userId]) // сюда нужно будет передать функцию которая будет записывать логи с ошибками
            return res.status(200).json(getResponseJSON("0011002"))
          }
          if (err) return res.status(200).json(getResponseJSON("0001003", 'ошибка БД INSERT INTO telephones (telephone_number, user_id) VALUES (?, ?)'))
          if (telephoneNumber === fakeTel) {
            ifGetCheckGooqlePlay()
            return res.status(200).json({
              "result": 'OK',
              "description": "SMS is sent1111",
              "responseCode": "0010000",
            })
          }


          smsGenerator(req, res, next, insertTelephoneRows.insertId, telephoneNumber, app)
        })
      })
    }
    else if (selectTelephonesRows[0]['delete_'] === 1) {
      return res.status(400).json(getResponseJSON('0001004'))
    } else {
      // такая ситуация, при которой user и его телефон уже существуют, но токена у клиента нет -- возможна, при утрате токена или при запросе первичной СМС, но когда на первую СМС-ку пользователь не отреагировал.
      db.run('SELECT * FROM smscodes WHERE telephone_id = ?', [selectTelephonesRows[0].telephone_id], (err, selectSmsCodeRows) => {
        if (err) return res.status(200).json(getResponseJSON("0001003", 'ошибка БД SELECT * FROM smscodes WHERE telephone_id = ?'))
        if (selectSmsCodeRows.length) {
          const json = getResponseJSON("0011001", 'where selectSmsCodeRows.length')
          let smsTimeout = Math.floor((deleteSmsTime - ((new Date()) - (new Date(selectSmsCodeRows[0].time_)))) / 1000)
          json["smsTimeout"] = smsTimeout > 0 ? smsTimeout : 0
          return res.status(200).json(json)
        }

        // это пиздец какой кастыль сделан для того, чтобы 
        if (telephoneNumber === fakeTel) {
          ifGetCheckGooqlePlay()
          return res.status(200).json({
            "result": 'OK',
            "description": "SMS is sent",
            "responseCode": "0010000",
          })
        }

        smsGenerator(req, res, next, selectTelephonesRows[0].telephone_id, telephoneNumber, app)

      })
    }
  })
})
// надо сделать так, чтобы можно было делать повторные запросы для получения кода
// app.post('/api/getCodeForRegistrationByEmail', (req, res, next) => {
//     const body = req?.body, email = String(body?.email)
//     if (!email) return res.status(400).json(getResponseJSON("0061000"))
//     if (email.length > 50) res.status(400).json(getResponseJSON('0061001'))
//     // function isValidEmail(email) {
//     //     const emailRegex = /^[a-zA-Zа-яА-Я0-9._%+-]+@[a-zA-Zа-яА-Я0-9.-]+\.[a-zA-Zа-яА-Я]{2,}$/;
//     //     return emailRegex.test(email);
//     // }
//     if (!isValidEmail(email)) res.status(400).json(getResponseJSON('0061002'))
//     db.run('SELECT * FROM emails WHERE email_value = ?', [email], (err, selectEmailsRows) => {
//         if (err || selectEmailsRows.length > 1) return res.status(500).json(getResponseJSON("0001003"))
//         if (!selectEmailsRows.length) {
//             db.run("INSERT INTO users () VALUE ()", [], (err, insertUsersRows) => {
//                 if (err) return res.status(500).json(getResponseJSON("0001003", 'ошибка БД INSERT INTO users () VALUE ()'))
//                 const userId = insertUsersRows.insertId
//                 db.run('INSERT INTO emails (email_value, user_id) VALUES (?, ?)', [email, userId], (err, insertEmailRows) => {
//                     if (err?.code === "ER_DUP_ENTRY") {
//                         db.run('DELETE FROM users WHERE user_id = ?', [userId]) // сюда нужно будет передать функцию которая будет записывать логи с ошибками
//                         return res.status(500).json(getResponseJSON("0061003"))
//                     }
//                     if (err) return res.status(500).json(getResponseJSON("0001003"))
//                     // надо будет вставить функцию отправляющую электронное письмо (res, emailId, email)
//                     emailGenerator(res, insertEmailRows.insertId, email)
//                 })
//             }
//             )
//         } else {
//             const emailId = selectEmailsRows[0].email_id
//             db.run('SELECT * FROM emailidentificationсodes WHERE email_id = ?', [emailId], (err, selectEmailIdentificationCodesRows) => {
//                 if (err) return res.status(500).json(getResponseJSON("0001003"))
//                 if (selectEmailIdentificationCodesRows.length) return res.status(400).json(getResponseJSON("0061004"))
//                 // надо будет вставить функцию отправляющую электронное письмо (res, emailId, email)
//                 emailGenerator(res, emailId, email)
//             })
//         }
//     })

// })
app.post('/api/getTokens', (req, res, next) => {
  const body = req?.body, telephoneNumber = body?.telephoneNumber, smsCode = body?.smsCode, userName = body?.userName
  // тест готов
  if (!telephoneNumber || !smsCode) return res.status(200).json(getResponseJSON("0001000"))
  const telephoneNumberLength = telephoneNumber.length
  // тест готов
  if (isNaN(Number(telephoneNumber)) || (telephoneNumberLength < telephoneNumberMin || telephoneNumberLength > telephoneNumberMax)) return res.status(200).json(getResponseJSON('0001002'))
  // тест готов
  if (smsCode.length !== smsCodeNumberOfCharacters) return res.status(200).json(getResponseJSON("0041001"))
  // тест готов
  if (userName && userName.length > maxLenghtOfUserName) return res.status(200).json(getResponseJSON("0041002"))
  db.run('SELECT * FROM telephones WHERE telephone_number = ?', [telephoneNumber], (err, selectTelephonesRows) => {
    if (err || selectTelephonesRows.length > 1) return res.status(200).json(getResponseJSON("0001003", 'ощибка БД SELECT * FROM telephones WHERE telephone_number = ?'))
    // тест готов
    if (!selectTelephonesRows.length) return res.status(200).json(getResponseJSON("0041000"))
    if (selectTelephonesRows[0]['delete_']) return res.status(400).json(getResponseJSON('0001004'))
    const now = new Date()
    const userId = selectTelephonesRows[0].user_id




    db.run('SELECT * FROM smscodes WHERE telephone_id = ? AND smscode_timeLastAttempt > ?', [selectTelephonesRows[0].telephone_id, getTimeForMySQL(now.setMilliseconds(now.getMilliseconds() - deleteSmsTime))], (err, selectSmsCodeRows) => {
      if (err || selectSmsCodeRows.length > 1) return res.status(200).json(getResponseJSON("0001003", 'ощибка БД SELECT * FROM smscodes WHERE telephone_id = ?'))

      if (telephoneNumber !== fakeTel) {
        if (!selectSmsCodeRows.length) return res.status(200).json(getResponseJSON("0041001", 'в таблице smscodes записи для данного телефона нет'))
        if (selectSmsCodeRows[0].smscode_value != smsCode) return res.status(200).json(getResponseJSON("0041001", 'код смс не соответсвует'))
      } else {
        ifGetCheckGooqlePlay()
        if (smsCode !== '12345') return res.status(200).json(getResponseJSON("0041001", 'код смс не соответсвует'))
      }


      // tect готов


      db.run("SELECT o.owner_id AS o_owner_id , o.user_id AS o_user_id, o.comment_ AS o_comment_ , o.time_ AS o_time_, o.delete_ AS o_delete_, u.user_name AS u_user_name, u.comment_ AS u_comment_ , u.time_ AS u_time_, u.delete_ AS u_delete_ FROM owners o INNER JOIN users u ON o.user_id = u.user_id WHERE o.user_id = ?", [userId], (err, selectOwnersRows) => {
        if (err) return res.status(200).json(getResponseJSON("0001003", 'ощибка БД SELECT * FROM owners WHERE user_id = ?'))
        if (!selectOwnersRows.length) {
          db.run('INSERT INTO owners (user_id) VALUES (?)', [userId], (err, insertOwnersRows) => {
            if (err?.code === "ER_DUP_ENTRY") return res.status(200).json(getResponseJSON("0041002", 'ощибка БД INSERT INTO owners (user_id) VALUES (?)'))
            if (err) return res.status(200).json(getResponseJSON("0001003", 'ощибка БД INSERT INTO owners (user_id) VALUES (?)'))
            console.log(userName, ' this is userName')
            return makeConnectionUpdateUsersReturnJSON(req, res, next, db, getResponseJSON, addTextInComment, getTokenFunction, userId, credentials, tokenExpire, longTokenExpire, userName, { id: insertOwnersRows.insertId, toDeleteOwner: true }, 'reg')
          })
        } else {
          console.log(selectOwnersRows[0].u_user_name)

          return makeConnectionUpdateUsersReturnJSON(req, res, next, db, getResponseJSON, addTextInComment, getTokenFunction, userId, credentials, tokenExpire, longTokenExpire, userName ? userName : selectOwnersRows[0].u_user_name, { id: selectOwnersRows[0].o_owner_id, toDeleteOwner: false }, 'auth')
        }
      })
    })
  })
})

// app.post('/api/getTokenByEmail', (req, res, next) => {
//     const body = req?.body, email = body?.email, code = body?.сode, userName = body?.userName
//     if (!email || !code) return res.status(400).json(getResponseJSON('0071000'))
//     if (code.length !== emailCodeNumberOfCharacters) return res.status(400).json(getResponseJSON('0071001'))
//     if (isNaN(Number(code))) return res.status(400).json(getResponseJSON('0071002'))
//     if (email.length > 50) return res.status(400).json(getResponseJSON('0071003'))
//     if (isValidEmail(email)) return res.status(400).json(getResponseJSON('0071004'))
//     db.run('SELECT * FROM emails WHERE email_value = ?', [email], (err, selectEmailsRows) => {
//         if (err || selectEmailsRows.length > 1) return res.status(500).json(getResponseJSON('0001003'))
//         if (!selectEmailsRows.length) return res.status(400).json(getResponseJSON('0071005'))
//         db.run('SELECT * FROM emailidentificationсodes WHERE email_id = ? AND emailidentificationсode_timeLastAttempt > ?', [selectEmailsRows[0].email_id,  getTimeForMySQL(now.setMilliseconds(now.getMilliseconds() - deleteEmailCodeTime))], (err, selectEmailidentificationcodesRows) => {
//             if (err || selectEmailidentificationcodesRows.length > 1) res.status(500).json(getResponseJSON('0001003'))
//             if (!selectEmailidentificationcodesRows.length) res.status(400).json(getResponseJSON('0071006'))
//             if (selectEmailidentificationcodesRows[0].emailidentificationсode_value !== code) return res.status(400).
//     })
//     })
// })

app.post(`/api/checkToken`, (req, res, next) => {
  try {
    const body = req?.body, accessToken = body?.accessToken
    if (!accessToken) return res.status(200).json(getResponseJSON('0001000'))
    jwt.verify(accessToken, credentials.tokenSecret, (err, decoded) => {
      try {
        if (err) {
          /* 
          {
      expiredAt: 2025-06-24T09:55:06.000Z --- это время истечения времени действия токена
    }
          */
          const jsonResoponse = getResponseJSON('0031001')
          jsonResoponse.tokenExpireDate = Math.floor((new Date(err.expiredAt).getTime()) / 1000)
          return res.status(400).json(jsonResoponse)
        }
        /* 
        decoded
    { 
      userId: 10, 
     connectionId: 24, 
     iat: 1750758251, -- вмрея создания в СЕКУНДАХ
     exp: 1750761851 -- время истечения действия в СЕКУНДАХ
     }
    
        */
        db.run('SELECT * FROM users WHERE user_id = ?', [decoded.userId], (err, selectUsersRows) => {
          try {
            if (err) return res.status(500).json(getResponseJSON('0001003'))
            if (selectUsersRows.length > 1) return res.status(500).json(getResponseJSON('0001003'))
            if (selectUsersRows.length == 0) return res.status(200).json(getResponseJSON('0031002'))
            if (selectUsersRows[0]['delete_'] === 1) return res.status(400).json(getResponseJSON('0031000'))
            const jsonResoponse = getResponseJSON('0030000')
            jsonResoponse.tokenExpireDate = decoded.exp
            return res.status(200).json(jsonResoponse)
          } catch (e) {
            return res.status(500).json(getResponseJSON('0001003'))
          }
        })
      } catch (e) {
        return res.status(500).json(getResponseJSON('0001003'))
      }
    })
  } catch (e) {
    return res.status(500).json(getResponseJSON('0001003'))
  }
})

app.post('/api/checkLegalDevice', (req, res, next) => {
  const body = req?.body, accessToken = body?.accessToken, deviceQRcode = body?.deviceQRcode
  if (!accessToken) return res.status(200).json({
    "result": 'ERR',
    "description": "the request JSON structure does not match URL",
    "responseCode": "0001000"
  })
  jwt.verify(accessToken, credentials.tokenSecret, (err, decoded) => {
    if (err) {
      return res.status(200).json(
        {
          "result": 'ERR',
          "description": "Token is wrong",
          "responseCode": "0001001",
        }
      )
    }
    db.run('SELECT * FROM users WHERE user_id = ?', [decoded.userId], (err, selectUsersRows) => {
      if (err) return res.status(200).json({
        "result": 'ERR',
        "description": `Something went wrong${addTextInComment('ощибка БД SELECT * FROM users WHERE user_id =?')}`,
        "responseCode": "0001003",
      })
      if (selectUsersRows.length > 1) return res.status(200).json({
        "result": 'ERR',
        "description": `Something went wrong${addTextInComment('ощибка: после SELECT * FROM users WHERE user_id =? -- selectUsersRows.length > 1')}`,
        "responseCode": "0001003",
      })
      if (selectUsersRows.length == 0) return res.status(200).json({
        "result": 'ERR',
        "description": `Something went wrong${addTextInComment('ощибка: после SELECT * FROM users WHERE user_id =? -- selectUsersRows.length == 0')}`,
        "responseCode": "0001003",
      })
      if (selectUsersRows[0]['delete_'] === 1) return res.status(400).json(getResponseJSON('0001004'))

      // return res.status(200).json({
      //     "result": 'OK',
      //     "description": "Token is try",
      //     "responseCode": "0030000",
      //     'userName': selectUsersRows[0].user_name ?? "not provided"
      // })
      if (!deviceQRcode) return res.status(400).json({
        "result": "ERR",
        "description": "Something went wrong with qr-code ",
        "responseCode": "0001003", // код надо исправить
      })
      // kuhalkulkjbgjhgjshgcnbvccvxdsgfdhgfjgvbfdsfgdsawqewydfdtjtjhgfjghfbnvcnbvcjgjhgfttygfdsgfdsgfdsgfdsgdfsgfdsgfdsvbvcxxdhgfdhgfd
      const postData = JSON.stringify({
        serverToken,
        qrCode: deviceQRcode
      });
      let port
      let hostname
      let rejectUnauthorized
      let requestCert
      let agent
      switch (app.get('env')) {
        case 'test':
          port = 443;
          hostname = 'getoff.online';
          rejectUnauthorized = true;
          requestCert = false;
          agent = true;
          break;
        case 'production':
          port = 443;
          hostname = 'getoff.online';
          // rejectUnauthorized = true;
          // requestCert = false;
          // agent = true;
          break;
        case 'development':
          port = 3333;
          hostname = 'localhost';
          rejectUnauthorized = false;
          requestCert = true;
          agent = false;
          break;
        default:
          port = 443;
          hostname = 'getoff.online';
          rejectUnauthorized = true;
          requestCert = false;
          agent = true;
      }
      const remoteServerOptions = {
        hostname,
        port,
        path: '/fromServer/checkQRcode',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        // это для работы с самоподвисанным сертификатом
        // rejectUnauthorized: false,
        // requestCert: true,
        // agent: false
        rejectUnauthorized,
        requestCert,
        agent
      };
      console.log(remoteServerOptions)
      // const remoteServerOptions = {
      //     hostname: 'localhost',
      //     port: 3333,
      //     path: '/fromServer/checkQRcode',
      //     method: 'POST',
      //     headers: {
      //         'Content-Type': 'application/json',
      //         'Content-Length': Buffer.byteLength(postData)
      //     },
      //     // это для работы с самоподвисанным сертификатом
      //     // rejectUnauthorized: false,
      //     // requestCert: true,
      //     // agent: false
      //     rejectUnauthorized: false,
      //     requestCert: true,
      //     agent: false
      // };
      const request = https.request(remoteServerOptions, (response) => {
        console.log(`STATUS: ${response.statusCode}`)
        console.log(`HEADERS: ${JSON.stringify(response.headers)}`)
        response.setEncoding('utf-8')
        let data = ''
        response.on('data', (d) => {
          data += d
          console.log(`BODY: ${d}`)
        });
        /* 
        {
"code": 0,
"description": "OK. This is device data",
"data": {
"device": {
"id": "",
"bar": "",
"qr": "",
"type: "",
"role: "",
"mac": "",
"prodtime: "",
"fwversion": ""
}
}
}
        */
        response.on('end', () => {
          const endData = JSON.parse(data)
          const responseCode = endData?.code
          console.log(responseCode)
          if ([
            undefined,
            null,
            1,
            2,
            3
          ].find(x => x === responseCode)) return res.status(500).json(getResponseJSON('0001003'))
          if (responseCode === 4) return res.status(200).json(getResponseJSON('0051000'))
          delete endData.code
          delete endData.descr
          const responsePropertyNames = [
            "id",
            "bar",
            "qr",
            "type",
            "role",
            "mac",
            "prodtime",
            "fwversion"
          ]
          if (responsePropertyNames.find(x => !x in endData) || responsePropertyNames.find(x => endData[x] === null)) return res.status(400).json(getResponseJSON('0051001'))
          const responseJson = getResponseJSON('0050000')
          responseJson['data'] = endData
          return res.status(200).json(responseJson)
        }
        )
      });

      request.on('error', (e) => {
        console.error(e);
        return res.status(500).json(getResponseJSON('0001003'))
      });
      request.write(postData);
      request.end();
    })
  });
})

// 
app.post('/api/setConfig', (req, res, next) => {
  try {
    let body = req?.body, accessToken = body?.accessToken, conf = body?.conf
    if (!accessToken) return res.status(200).json({
      "result": 'ERR',
      "description": "the request JSON structure does not match URL",
      "responseCode": "0001000"
    })
    jwt.verify(accessToken, credentials.tokenSecret, (err, decoded) => {
      try {
        if (err) {
          return res.status(200).json(
            {
              "result": 'ERR',
              "description": "Token is wrong",
              "responseCode": "0001001",
            }
          )
        }
        db.run('SELECT * FROM users WHERE user_id = ?', [decoded.userId], (err, selectUsersRows) => { // здесь ошибка
          try {
            if (err) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка БД SELECT * FROM users WHERE user_id =?')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows.length > 1) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка: после SELECT * FROM users WHERE user_id =? -- selectUsersRows.length > 1')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows.length == 0) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка: после SELECT * FROM users WHERE user_id =? -- selectUsersRows.length == 0')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows[0]['delete_'] === 1) return res.status(400).json(getResponseJSON('0001004'))
            if (!conf) return res.status(400).json(getResponseJSON('0081000'))
            if (typeof (conf) !== 'object') return res.status(400).json('0081001')
            conf = JSON.stringify(conf)
            db.run('SELECT owner_id FROM owners WHERE user_id = ?', [decoded.userId], (err, selectOwnersRows) => {
              try {
                if (err) return res.status(500).json(getResponseJSON('0001003'))
                if (selectOwnersRows.length > 1) return res.status(500).json(getResponseJSON('0001003'))
                if (!selectOwnersRows.length) return res.status(500).json(getResponseJSON('0001003')) // в данном запросе запись в owners уже должна быть. Записть производиться при запросе getToken
                const ownerId = selectOwnersRows[0].owner_id
                db.run('SELECT * FROM conf WHERE owner_id = ?', [ownerId], (err, selectConfRows) => {
                  try {
                    if (err) return res.status(500).json(getResponseJSON('0001003'))
                    if (!selectConfRows.length) {
                      db.run("INSERT INTO conf (conf_json, owner_id) VALUES (?, ?)", [conf, ownerId], (err, insertConfRows) => {
                        try {
                          if (err) return res.status(500).json(getResponseJSON('0001003'))
                          return res.status(200).json(getResponseJSON('0080000'))
                        } catch (e) {
                          return res.status(500).json(getResponseJSON('0001003'))
                        }
                      })
                    } else {
                      db.run('UPDATE conf SET conf_json = ?, conf_timestamp = DEFAULT WHERE owner_id = ?', [conf, ownerId], (err, updateConf) => {
                        try {
                          if (err) return res.status(500).json(getResponseJSON('0001003'))
                          return res.status(200).json(getResponseJSON('0080000'))
                        } catch (e) {
                          return res.status(500).json(getResponseJSON('0001003'))
                        }
                      })
                    }
                  } catch (e) {
                    return res.status(500).json(getResponseJSON('0001003'))
                  }
                })
              } catch (e) {
                return res.status(500).json(getResponseJSON('0001003'))
              }
            })
          } catch (e) {
            return res.status(500).json(getResponseJSON('0001003'))
          }
        })
      } catch (e) {
        return res.status(500).json(getResponseJSON('0001003'))
      }
    })
  } catch (e) {
    return res.status(500).json(getResponseJSON('0001003'))
  }
})

app.post('/api/getConfig', (req, res, next) => {
  try {
    const body = req?.body, accessToken = body?.accessToken
    if (!accessToken) return res.status(200).json(getResponseJSON('0001000'))
    jwt.verify(accessToken, credentials.tokenSecret, (err, decoded) => {
      try {
        if (err) {
          return res.status(200).json(
            {
              "result": 'ERR',
              "description": "Token is wrong",
              "responseCode": "0001001",
            }
          )
        }
        db.run('SELECT * FROM users WHERE user_id = ?', [decoded.userId], (err, selectUsersRows) => {
          try {
            if (err) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка БД SELECT * FROM users WHERE user_id =?')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows.length > 1) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка: после SELECT * FROM users WHERE user_id =? -- selectUsersRows.length > 1')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows.length == 0) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка: после SELECT * FROM users WHERE user_id =? -- selectUsersRows.length == 0')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows[0]['delete_'] === 1) return res.status(400).json(getResponseJSON('0001004'))


            db.run('SELECT owner_id FROM owners WHERE user_id = ?', [decoded.userId], (err, selectOwnersRows) => {
              try {
                if (err) return res.status(500).json(getResponseJSON('0001003'))
                if (selectOwnersRows.length > 1) return res.status(500).json(getResponseJSON('0001003'))
                if (!selectOwnersRows.length) return res.status(500).json(getResponseJSON('0001003')) // в данном запросе запись в owners уже должна быть. Записть производиться при запросе getToken
                const ownerId = selectOwnersRows[0].owner_id
                db.run('SELECT * FROM conf WHERE owner_id = ?', [ownerId], (err, selectConfRows) => {
                  try {
                    if (err) return res.status(500).json(getResponseJSON('0001003'))
                    if (selectConfRows.length > 1) return res.status(500).json(getResponseJSON('0001003'))
                    if (!selectConfRows.length) return res.status(400).json(getResponseJSON('0091000'))
                    const JSONobj = getResponseJSON('0090000')
                    JSONobj.configuration = JSON.parse(selectConfRows[0].conf_json)
                    JSONobj.configurationTimeMark = (new Date(selectConfRows[0].conf_timestamp).getTime()) / 1000
                    return res.status(200).json(JSONobj)
                  } catch (e) {
                    return res.status(500).json(getResponseJSON('0001003'))
                  }
                })
              } catch (e) {
                return res.status(500).json(getResponseJSON('0001003'))
              }
            })
          } catch (e) {
            return res.status(500).json(getResponseJSON('0001003'))
          }
        })
      } catch (e) {
        return res.status(500).json(getResponseJSON('0001003'))
      }
    })
  } catch (e) {
    return res.status(500).json(getResponseJSON('0001003'))
  }
})

app.post('/api/deleteConfig', (req, res, next) => {
  try {
    const body = req?.body, accessToken = body?.accessToken
    if (!accessToken) return res.status(200).json(getResponseJSON('0001000'))
    jwt.verify(accessToken, credentials.tokenSecret, (err, decoded) => {
      try {
        if (err) {
          return res.status(200).json(
            {
              "result": 'ERR',
              "description": "Token is wrong",
              "responseCode": "0001001",
            }
          )
        }
        db.run('SELECT * FROM users WHERE user_id = ?', [decoded.userId], (err, selectUsersRows) => {
          try {
            if (err) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка БД SELECT * FROM users WHERE user_id =?')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows.length > 1) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка: после SELECT * FROM users WHERE user_id =? -- selectUsersRows.length > 1')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows.length == 0) return res.status(200).json({
              "result": 'ERR',
              "description": `Something went wrong${addTextInComment('ощибка: после SELECT * FROM users WHERE user_id =? -- selectUsersRows.length == 0')}`,
              "responseCode": "0001003",
            })
            if (selectUsersRows[0]['delete_'] === 1) return res.status(400).json(getResponseJSON('0001004'))


            db.run('SELECT owner_id FROM owners WHERE user_id = ?', [decoded.userId], (err, selectOwnersRows) => {
              try {
                if (err) return res.status(500).json(getResponseJSON('0001003'))
                if (selectOwnersRows.length > 1) return res.status(500).json(getResponseJSON('0001003'))
                if (!selectOwnersRows.length) return res.status(500).json(getResponseJSON('0001003')) // в данном запросе запись в owners уже должна быть. Записть производиться при запросе getToken
                const ownerId = selectOwnersRows[0].owner_id
                db.run('SELECT * FROM conf WHERE owner_id = ?', [ownerId], (err, selectConfRows) => {
                  try {
                    if (err) return res.status(500).json(getResponseJSON('0001003'))
                    if (selectConfRows.length > 1) return res.status(500).json(getResponseJSON('0001003'))
                    if (!selectConfRows.length) return res.status(400).json(getResponseJSON('0101000'))
                    db.run('DELETE FROM conf WHERE owner_id = ?', [ownerId], (err, deleteConfRows) => {
                      try {
                        if (err) return res.status(500).json(getResponseJSON('0001003'))
                        return res.status(200).json(getResponseJSON('0100000'))
                      } catch (e) {
                        return res.status(500).json(getResponseJSON('0001003'))
                      }
                    })
                  } catch (e) {
                    return res.status(500).json(getResponseJSON('0001003'))
                  }
                })
              } catch (e) {
                return res.status(500).json(getResponseJSON('0001003'))
              }
            })
          } catch (e) {
            return res.status(500).json(getResponseJSON('0001003'))
          }
        })
      } catch (e) {
        return res.status(500).json(getResponseJSON('0001003'))
      }
    })
  } catch (e) {
    return res.status(500).json(getResponseJSON('0001003'))
  }
})

app.get('/api/testrequest', (req, res, next) => {
  if (app.get('env') === 'production') return next()
  console.log(req)
  db.run('SELECT * FROM users WHERE user_id = 5', [], (err, rows) => {
    if (err) res.status(200).send(err)
    if (rows.length == 0) res.status(200).send('somethisn is wrong')
    console.log('comment_', rows[0].comment_)
    res.status(200).json({
      "user_id": rows[0].user_id,
      "user_name": rows[0].user_name,
      'comment_': rows[0].comment_,
      'time_': rows[0].time_
    })
  })
})

app.post('/api/signup', function (req, res, next) {
  const username = req.body.username
  db.run('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ request: 'error', message: err.message });
    if (row.length != 0) return res.status(200).json({ request: 'bad', message: 'This login already exists' })
    var salt = crypto.randomBytes(16);
    crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', function (err, hashedPassword) {
      if (err) return res.status(500).json({ request: 'error', message: err.message })
      db.run('INSERT INTO users (username, hashed_password, salt, email) VALUES (?, ?, ?, ?)', [
        username,
        hashedPassword,
        salt,
        req.body.email
      ], function (err, rows) {
        if (err) return res.status(500).json({ request: 'error', message: err.message })
        // const token = jwt.sign({ username }, credentials.tokenSecret, { expiresIn: tokenExpire })
        // const longToken = jwt.sign({ username }, credentials.longTokenSecret, { expiresIn: longTokenExpire })
        // res.status(200).json({ request: 'good', message: 'You are registered', token, longToken });
        return forSignupAPI(req, res, next, db, rows.insertId)
      });
    });
  })
})

app.post('/api/login/password', passport.authenticate('local', {
  failureRedirect: '/api/loginfailer'
}), (req, res, next) => {
  const username = req.body.username
  db.run('SELECT * FROM users WHERE username = ?', [username], (err, rows) => {
    if (err) return res.status(500).json({ request: 'error', message: err.message })
    return forSignupAPI(req, res, next, db, rows[0].id)
  })

  // const token = jwt.sign({ username }, credentials.tokenSecret, { expiresIn: tokenExpire })
  // const longToken = jwt.sign({ username }, credentials.longTokenSecret, { expiresIn: longTokenExpire })
  // res.status(200).json({ request: 'good', message: 'You are registered', token, longToken });
});
// app.post('/api/test', passport.authenticate('jwt', { session: false }), (req, res) => {
//     const login = req.user.login;
//     res.status(200).json({ login });
// });
app.get('/api/loginfailer', (req, res, next) => {
  res.status(200).json({ request: 'bad', message: 'Not right login of pass' });
})

app.post('/api/logout', authenticateToken, (req, res, next) => { // по данному урлу мы не можем сделать токен не действительным, мы просто удаляем запись об подключенных устройствах
  // req.user -- здесь хранятся данные после расшифровки из токена
  db.run('UPDATE connections SET delete_ = 1 WHERE id = ?', [req.user.connectionId], (err, rows) => {
    if (err) return next(err)
    res.status(200).json({ request: 'good', message: 'Your gadget is not on air' })
  })
})
// app.post('/api/refreshtoken', authenticateLongToken, (req, res, next) => { // от клиента должен приходить параметер longToken.
//   const { username, connectionId, usersId } = req.user
//   const params = { username, connectionId, usersId }
//   // const getToken = (tokenExpire) => {
//   //     return jwt.sign({ username, usersId, connectionId }, credentials.tokenSecret, { expiresIn: tokenExpire })
//   // }
//   // const token = jwt.sign({ username, usersId, connectionId }, credentials.tokenSecret, { expiresIn: tokenExpire })
//   // const longToken = jwt.sign({ username, usersId, connectionId }, credentials.longTokenSecret, { expiresIn: longTokenExpire })
//   // res.status(200).json({ 
//   //     request: 'good', 
//   //     message: 'You are registered', 
//   //     token: getToken(tokenExpire), 
//   //     longToken: getToken(longTokenExpire)  
//   // })
//   // const getToken = getTokenFunction({ username, connectionId,  usersId }, )
//   res.status(200).json({
//     request: 'good',
//     message: 'You are registered',
//     // token: getToken(tokenExpire), 
//     // longToken: getToken(longTokenExpire)  
//     token: getTokenFunction(params, credentials.tokenSecret)(tokenExpire),
//     longToken: getTokenFunction(params, credentials.longTokenSecret)(longTokenExpire)
//   })
// })
app.post('/api/refreshtoken', (req, res, next) => {
  try {
    const body = req?.body, refreshToken = body?.refreshToken
    if (!refreshToken) return res.status(200).json(getResponseJSON('0001000'))
    jwt.verify(refreshToken, credentials.longTokenSecret, (err, decoded) => {
      try {
        if (err) {
          const jsonResoponse = getResponseJSON('0111002')
          jsonResoponse.tokenExpireDate = Math.floor((new Date(err.expiredAt).getTime()) / 1000)
          return res.status(400).json(jsonResoponse)
        }
        db.run('SELECT * FROM users WHERE user_id = ?', [decoded.userId], (err, selectUsersRows) => {
          try {
            if (err) return res.status(500).json(getResponseJSON('0001003', 'refreshToken 7'))
            if (selectUsersRows.length > 1) return res.status(500).json(getResponseJSON('0001003', 'refreshToken 6'))
            if (selectUsersRows.length == 0) return res.status(400).json(getResponseJSON('0111000'))
            if (selectUsersRows[0]['delete_'] === 1) return res.status(400).json(getResponseJSON('0111001'))
            const userAgent = req?.headers['user-agent'] ?? 'Unknown'
            db.run('INSERT INTO connections (connection_userAgent, connection_type, user_id) VALUES (?, ?, ?)', [userAgent, "token", decoded.userId], (err, insertConnectionsRows) => {
              try {
                if (err) return res.status(500).json(getResponseJSON('0001003', 'refreshToken 5'))
                const jsonResoponse = getResponseJSON('0110000')
                const params = { userId: decoded.userId, connectionId: insertConnectionsRows.insertId}
                  jsonResoponse.accessToken = getTokenFunction(params, credentials.tokenSecret)(tokenExpire)
                  return res.status(200).json(jsonResoponse)
              } catch (e) {
                return res.status(500).json(getResponseJSON('0001003', 'refreshToken 4'))
              }
            })
          } catch (e) {
            return res.status(500).json(getResponseJSON('0001003', 'refreshToken 3'))
          }
        })
      } catch (e) {
        return res.status(500).json(getResponseJSON('0001003', 'refreshToken 2'))
      }
    })
  } catch (e) {
    return res.status(500).json(getResponseJSON('0001003', 'refreshToken 1'))
  }
})
app.post('/api/test', authenticateToken, (req, res) => { // это реально тестовая вещь
  // const username = req.user.username;
  // res.status(200).json({ username });
  const user = req.user
  res.status(200).json(user)
})

// usersId, connectionId: rows.insertId
app.post('/api/sendemailpass', (req, res, next) => { // в данном запросе мы не ждем токен, потому что  это восстановление пароля и пользователь не помнить ничего кроме логина
  /* 
  по данному запросу мы не проводим регистрацию пользователя в подключенных, потому что он еще не авторизован
  */
  const { username } = req.body


  db.run('SELECT email FROM users WHERE username = ?', [username], (err, rows) => {
    if (err) return res.status(500).json({ request: 'error', message: err.message });
    if (rows.length !== 1) return res.status(500).json({ request: 'error', message: 'Username is error' })

    // const resetToken = jwt.sign({ username }, credentials.emailTokenSecret, { expiresIn: emailTokenExpire })
    // const resetToken = getTokenFunction({ username }, credentials.emailTokenSecret)(emailTokenExpire)
    const url = `${httpProtocol}://${domen}:${port}/api/${urlResetPass}/${getTokenFunction({ username }, credentials.emailTokenSecret)(emailTokenExpire)}`
    // в строке выше мы передали функции getTokenFunction объект с одним свойством username, но в случае необходимости можем передать и еще какие-нибудь
    const mailOptions = {
      from: yourEmail,
      to: rows[0].email,
      subject: 'Password Reset',
      text: `To reset your password, click on the following link: ${url}`, // теги не работают надо как-то по другому
      html: `<!doctype html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                    h1 {
                        color: red;
                    }
                </style>
              </head>
              <body>
                <h1>Hi</h1>
                <p>To reset your password, click on : <a href='${url}'>the following link</a></p>
              </body>
            </html>`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ request: 'error', message: 'Failed to send password reset email' });
      }
      res.status(200).json({ request: 'good', message: 'Password reset email sent successfully' });
    });
  })
})
app.get(`/api/${urlResetPass}/:token`, (req, res, next) => {
  const { token } = req.params;
  jwt.verify(token, credentials.emailTokenSecret, (err, decoded) => {
    if (err) return res.status(400).json({ request: 'error', message: 'Invalid or expired reset token' });
    const params = decoded

    params.layout = null // это добавлен параметер сообщающий, что в шаблоне не нужно использовать шаблон
    params.token = token
    return res.render('reset-pass', params)
  })
})
app.post('/api/reset-pass', (req, res, next) => {
  const { token, password } = req.body
  jwt.verify(token, credentials.emailTokenSecret, (err, decoded) => {
    if (err) return res.status(400).json({ request: 'error', message: 'Invalid or expired reset token' });
    const { username } = decoded
    const salt = crypto.randomBytes(16);
    crypto.pbkdf2(password, salt, 310000, 32, 'sha256', function (err, hashedPassword) {
      if (err) return res.status(500).render('error')
      db.run('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).render('error')
        if (row.length !== 1) return res.status(500).render('error')
        const id = row[0].id
        db.run('UPDATE users SET hashed_password = ?, salt = ? WHERE id = ?', [
          hashedPassword,
          salt,
          id
        ], function (err, row) {
          if (err) return res.status(500).render('error')


          // const token = jwt.sign({ username }, credentials.tokenSecret, { expiresIn: tokenExpire })
          // const longToken = jwt.sign({ username }, credentials.longTokenSecret, { expiresIn: longTokenExpire })

          // res.status(200).json({ request: 'good', message: 'You are registered', token, longToken });

          // res.status(200).json({ 
          //     request: 'good', 
          //     message: 'You are registered', 
          //     token:      getTokenFunction(params, credentials.tokenSecret)(tokenExpire), 
          //     longToken:  getTokenFunction(params, credentials.longTokenSecret)(longTokenExpire) 
          // })
          return forResAPI(req, res, next, db, id, username) // это неправильно, что я сделал здесь возврат json. Здесь надо возращать страничку с сообщением о том что все хорошо.
        })
      })

    })
  })
})
// app.post('/api/experiment-db', (req, res, next) => {
//     const { data } = req.body
//     db.run('UPDATE experiment SET data = ? WHERE id = 2', [data], (err, row) => {
//         console.log(row)
//     })
// })
// app.post('/api/test', authenticateToken, (req, res) => {
//     const login = req.user.login;
//     res.status(200).json({ login });
// });

// это тестовый участок кода
// app.post('/modapi/response', (req, res, next) => {
//     console.log(req.body)
//     res.json({ "lkjlkj": 12 })
// })
app.get('/testform', (req, res, next) => {
  // if (app.get('env') === 'production') return next()
  res.render('testform')
}
)
// пишу адрес странички чтобы удобней было копировать http://localhost:3000/testform
// это конец тестового участка кода
app.get('/tests', (req, res, next) => {
  if (app.get('env') === 'production') return next()
  res.render('tests', { layout: 'test' })
})
app.get('/getAPI', (req, res, next) => {

  res.render('getAPI', {

    layout: 'getAPI',

  })
}) // http://localhost:3000/getAPI
// http://localhost/getAPI
// NODE_ENV=production node app_cluster.js
// NODE_ENV=test node app.js
// export NODE_ENV=production
// пишу адрес странички чтобы удобней было копировать http://localhost:3000/tests
// пишу адрес странички чтобы удобней было копировать https://localhost/tests
// пишу адрес странички чтобы удобней было копировать http://localhost/tests
// scp -r /home/sagan/Projects/carEquipment/getAssistClientside/app/server root@31.128.50.232:/home
// ssh root@31.128.50.232 -- это для getAssistClientside
// export NODE_ENV=production
// npm install -g forever
// forever start app.js
// forever restart app.js
// forever stop app.js
// rm -r -- удаление директории со все содержимым

// это конец тестового участка кода
// app.get('/fail', (req, res) => {
//     throw new Error('Nope!')
// })
// app.get('/epic-fail', (req, res) => {
//     process.nextTick(() => {
//         throw new Error('Kaboom!')
//     })
//     res.send('embarrased')
// })
app.post('/getTesting', (req, res, next) => {
  const { input } = req.body
  let some = {
    input
  }
  res.status(200).json(some)
})
// custom 404 page
app.use((req, res) => {
  res.type('text/plain')
  res.status(404)
  res.send('404 - Not Found')
})
// custom 500 page
app.use((err, req, res, next) => {
  res.type('text/plain')
  res.status(500)
  res.send('500 - Server Error')
})

// forever start app.js
// forever restart app.js
// forever stop app.js

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION\n', err.stack);
  // сюда нужно вставить действия которые нужно закончить до того, как сервер ляжет
  process.exit(1)
})
function startServer(port) {
  app.listen(port, '127.0.0.1', () => console.log(
    `Express started on http://localhost:${port}; ` +
    ` ${app.get('env')} ` +
    `press Ctrl-C to terminate.`))
  /* Этот закомментированный код может быть использован в случае, если потребуется https без nginx */
  // https.createServer(options, app).listen(port, () => {
  //     console.log(`Express started in ${app.get('env')} mode ` +
  //         `on port + ${port}. On httpS https://localhost:${port}`)
  // })
}
if (require.main === module) {
  // application run directly; start app server
  startServer(process.env.PORT || 3000)
} else {
  // application imported as a module via "require": export
  // function to create server
  module.exports = startServer
}