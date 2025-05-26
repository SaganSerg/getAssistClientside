const db = require('./../db')
const {
    smtpKey,
    smtpHost,
    smtpPort,
    smtpUser,
    deleteEmailCodeTime,
    emailCodeNumberOfCharacters,
    yourEmail
} = require('./../config')
const nodemailer = require('nodemailer')
dataForAPI = require('./dataForAPInode')
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



module.exports = {
    emailGenerator: (res, emailId, email) => {
        const emailCode = ((x) => {
            let emailCode = ''
            for (let i = 1; i <= x; i++) {
                emailCode += String(Math.floor(Math.random() * 9))
            }
            return emailCode
        })(emailCodeNumberOfCharacters)
        db.run('INSERT INTO emailidentificationсodes (emailidentificationсode_value, email_id) VALUE (?, ?)', [emailCode, emailId], (err, insertEmailIdentificationCodesRows) => {
            if (err?.code === "ER_DUP_ENTRY") return res.status(500).json(getResponseJSON('0061004'))
            if (err) return res.status(500).json(getResponseJSON('0001003'))
        })
        setTimeout(emailId => {
            db.run('DELETE FROM emailidentificationсodes WHERE email_id = ?', [emailId])
        }, deleteEmailCodeTime, emailId)

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: true,
            auth: {
                user: smtpUser,
                pass: smtpKey,
            },
        });

        const mailOptions = {
            from: yourEmail,
            to: email,
            subject: 'Сode for registration',
            text: `This is a code for registration: ${emailCode}`, // теги не работают надо как-то по другому
            html: `<!doctype html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                    h1 {
                        color: red;
                    }
                    .code {
                        font-weight: bold;
                    }
                </style>
              </head>
              <body>
                <h1>Hi</h1>
                <p>This is a code for registration: <span class='code'>${emailCode}</span></p>
              </body>
            </html>`,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) return res.status(500).json(getResponseJSON('0061005'))
            res.status(200).json(getResponseJSON('0060000'));
        });


    }
}