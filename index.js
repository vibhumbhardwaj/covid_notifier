require('dotenv').config();
const express = require('express');
const app = express();
var cookieParser = require('cookie-parser');
var favicon = require('serve-favicon');
var session = require('express-session');
const fetch = require('node-fetch');
var nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
var player = require('play-sound')(opts = { player: process.env.MUSIC_PLAYER });

///
// utils
///
const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

let isValidEmail = (email) => {
  return emailRegexp.test(email);
}

let createOTP = (length) => {
  return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
}

let getTodayDate = () => {

  let today = new Date();
  let dd = today.getDate();

  let mm = today.getMonth() + 1;
  let yyyy = today.getFullYear();

  let hh = today.getHours();
  let min = today.getMinutes();
  let sec = today.getSeconds();
  if (dd < 10) {
    dd = '0' + dd;
  }

  if (mm < 10) {
    mm = '0' + mm;
  }
  return [dd + '-' + mm + '-' + yyyy, `${hh}:${min}:${sec}`];
}


/// UTILS END

/* 
* statics and globals
*/

/* 
Memory_Emails will include all the emails that need to be notified.. Initiated on first run, and updated OTG as required.
Structure ::
['email@zoho.com', 'more@gmail.com']
*/
var Memory_Emails;
try{
  Memory_Emails = require('./RECEIVER_EMAILS.json').emails;
} catch (e) {
  Memory_Emails = [];
}

/*
Memory_Results will incorporate all the results tackled so far by the application.
Structure ::
{
  'dd-mm-yyyy' : ['hospital 1', 'hospital 2'],
  'd2-mm-yyyy' : ...
}
*/
var Memory_Results = {};

/*
for better logging. If not available recently, no need to print khatam tata bye bye...
*/
var Memory_Available_Recently=true;
var Memory_Error_Recently=false;

var Memory_LastSessionID = createOTP(99);;
var Memory_Sound_Toggle=true;
var Memory_Email_Toggle=true;

const KURUKSHETRA_ID = 186;

var transporter = nodemailer.createTransport({
  host: process.env.MAIL_SMTP_SERVER,
  port: process.env.MAIL_SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_SENDER_ID,
    pass: process.env.MAIL_APPLICATION_PASSWORD
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

const startingEmail = `<div style="background: red;">&nbsp;</div>
<div style="background: red;">&nbsp;</div>
<div style="background: red;">&nbsp;</div>
<h2 style="text-align: center;">Vacc Notifier&copy;</h2>
<h4 style="text-align: center;">janhit mein jaari .com</h4>
<div style="background: red;">&nbsp;</div>
<hr />
<h4>Hello Dear,</h4>`;

const slotsAvailableGreeting = `<h4>Saste Nashe is available in your area... Go enjoy:</h4><h4>&nbsp;</h4>`;

const bookSlotCallToAction = `<p>&nbsp;</p>
<h2><em>Please visit website: <a href="https://selfregistration.cowin.gov.in"><span style="background-color: #ffff00;">COWIN.GOV.IN</span></a> to book your slot now!</em></h2>
<p>&nbsp;</p>`;

let sudhaImg = `https://pbs.twimg.com/profile_images/485331283166244864/tUuqIX-R_400x400.jpeg`;
let ourFoto = `https://i.ibb.co/SK8W3cV/us.jpg`;
//sudha image dimensions: 220 220

const closingEmail = `<h3><em>Yours Truly,</em></h3>
<!--<h2>Kurukshetra Development Board</h2>-->
<p><img src="${ourFoto}" alt="" width="380" height="285" /></p>
<p><em>Ayy LMAO</em></p>
<div style="background: red;">&nbsp;</div>
<hr />
<p style="text-align: left;"><strong><em>Powered by Microsoft&trade; Azure Secure Services.</em></strong></p>`;



/**
 * Server stuff
 * START
 */
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(session({
  secret: 'fg94j499w43eur90wamk3we3',
  resave: false,
  saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

app.get('/', (req, res) => {
  res.render('index');
})

app.get('/test', (req, res) => {
  res.render('test');
})
let apiRouterSecured = express.Router();
let apiRouter = express.Router();
const server = app.listen(8080);
app.use('/api/secured',apiRouterSecured);
app.use('/api', apiRouter);


//////////
// CUTOM ROUTER MIDDLEWARES
//////////

apiRouterSecured.use((req, res, next) => {
  if(process.env.SECURITY_BYPASS==="true") {
    console.log(getTodayDate(), `>> Config Change >> ${req.originalUrl.split('/').pop()} >> ${JSON.stringify(req.body)}`);
    next();
  }
  else if(req.sessionID && req.sessionID == Memory_LastSessionID) {
    console.log(getTodayDate(), `>> Admin Access >> ${req.originalUrl.split('/').pop()} >> ${JSON.stringify(req.body)}`);
    next();
  } else {
    console.log(getTodayDate(), '<< wrong password >>');
    res.status(403).json({
      success: false
    })
  }
});



////////////////
// SERVER SIDE PROCESSES
// will send success and authorization. authorization needs to be added in headers for next call to server.
////////////////

let authorizeBypass = (req, res) => {
  if(process.env.SECURITY_BYPASS==="true") {
    Memory_LastSessionID = req.sessionID;
    res.json({
      success: true
    })
  } else {
    res.json({
      success: false
    })
  }
}

let authorize = (req, res) => {
  if(req.body.password == process.env.PASSKEY){
    Memory_LastSessionID = req.sessionID;
    res.json({
      success: true
    })
  } else {
    res.json({
      success: false
    })
  }
}

let addEmailToList = (req, res) => {
  let newEmail = req.body.email;
  if(Memory_Emails.includes(newEmail)) {
    Memory_LastSessionID = req.sessionID;
    return res.json({
      success: true,
      message: 'Already added'
    });
  } else if(isValidEmail(newEmail)) {
    return res.json({
      success: true,
      message: 'enter "EMAIL" dumass!'
    })
  }
  Memory_Emails.push(newEmail);
  let jsonToWrite = {
    emails: Memory_Emails
  }
  
  fs.writeFile(path.resolve(__dirname, 'RECEIVER_EMAILS.json'), JSON.stringify(jsonToWrite), err => {
    if (err) {
      console.error(`<<< URGENT >>> ${Memory_Emails[Memory_Emails.length - 1]} was not added to JSON. Manual Action required.`);
      player.play('./sirens.ogg');
      //todo: send error mail to admin
    }
  });
  Memory_LastSessionID = req.sessionID;
  return res.json({
    success: true,
    message: `Added ${newEmail}`
  })
}

let unsubscribeEmail = (req, res) => {
  let removeEmail = req.body.email;
  if(isValidEmail(removeEmail)) {
    return res.json({
      success: true,
      message: 'enter "EMAIL" dumass!'
    })
  } else if(!Memory_Emails.includes(removeEmail)) {
    Memory_LastSessionID = req.sessionID;
    return res.json({
      success: true,
      message: 'Already removed'
    });
  }
  Memory_Emails.splice(Memory_Emails.indexOf(removeEmail),1);
  let jsonToWrite = {
    emails: Memory_Emails
  }
  
  fs.writeFile(path.resolve(__dirname, 'RECEIVER_EMAILS.json'), JSON.stringify(jsonToWrite), err => {
    if (err) {
      console.error(`<<< URGENT >> ${Memory_Emails[Memory_Emails.length - 1]} was not removed from JSON. Manual Action required.`);
      player.play('./sirens.ogg');
      //todo: send email to admin
    }
  });
  Memory_LastSessionID = req.sessionID;
  return res.json({
    success: true,
    message: `Removed ${removeEmail}`
  })
}

let toggleSoundAlerts = (req, res) => {
  if(req.body.enableSounds) Memory_Sound_Toggle = true;
  else Memory_Sound_Toggle = false;
  Memory_LastSessionID = req.sessionID;
  res.json({
    success: true
  })
}

let toggleEmailAlerts = (req, res) => {
  if(req.body.enableEmails) Memory_Email_Toggle = true;
  else Memory_Email_Toggle = false;
  Memory_LastSessionID = req.sessionID;
  res.json({
    success: true
  })
}

////////////////////////
/////// ROUTER ENDPOINTS
////////////////////////
apiRouter.post('/authorize', authorize);
apiRouter.post('/authorizeBypass', authorizeBypass);

apiRouterSecured.post('/addNewEmail', addEmailToList);
apiRouterSecured.post('/unsubscribeEmail', unsubscribeEmail);
apiRouterSecured.post('/toggleSoundAlerts', toggleSoundAlerts);
apiRouterSecured.post('/toggleEmailAlerts', toggleEmailAlerts);

/**
 * Server stuff
 * END
 */








let sendEmailsBro = (result, currentDate) => {
  //console.log(currentDate, ' >> Sending Emails.. found something I guess.');
  if (!(result.length && result.length > 0)) return;
  let emailBody = startingEmail + slotsAvailableGreeting;
  for (let i = 0; i < result.length; i++) {
    emailBody += `<h4>${i + 1}. ${result[i]}</h4>`;
  }
  emailBody += bookSlotCallToAction + closingEmail;

  var mailOptions = {
    from: `"Kurukshetra Vacc Notifier" <${process.env.MAIL_SENDER_ID}>`,
    to: Memory_Emails.toString(),
    subject: `Available Centers: ${result.length}`,
    html: emailBody
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(currentDate, '<< error sending emails >>');
    } else {
      console.log(currentDate, `>> notified ${Memory_Emails.length} users`);
    }
  });
}

let clearCenterRecord = (date,centerName) => {
  Memory_Results[date].splice(Memory_Results[date].indexOf(centerName),1);
}

let runThisShit = () => {
  let result = [];
  let currentDate = getTodayDate();

  let url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByDistrict?district_id=${KURUKSHETRA_ID}&date=${currentDate[0]}`;

  let settings = {
    method: "GET",
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36'
    }
  };

  fetch(url, settings)
    .then(res => res.json())
    .then((json) => {
      let centers = json.centers;
      for (let i = 0; i < centers.length; i++) {
        let sessionName = centers[i].name;
        let sessions = centers[i].sessions;
        for (let j = 0; j < sessions.length; j++) {
          let available = +sessions[j].available_capacity;
          let date = sessions[j].date;
          if (available > 0 ) {
            if(!Array.isArray(Memory_Results[date])) {
              Memory_Results[date] = [];
            }
            if(!Memory_Results[date].includes(sessionName)) {
              result.push(`${sessionName}@${date} -- ${available} slot(s) available!`);
              Memory_Results[date].push(sessionName);
              setTimeout(clearCenterRecord(date,sessionName), 30000); //clears result after 30 seconds.
            }     
          }
          //console.log(`${sessionName}@${date} -- ${available}`);
        }
      }
      //console.log(`Total available centers with vaccines: ${result.length}`);
      //result.push(`Sorry bro no nashe available at the moment. <b>Ghar raho. Safe raho.</b>`);
      if (result.length > 0) {
        console.log(currentDate, `>> ${available} slots found !!`);
        if(Memory_Sound_Toggle) player.play('doorbell.mp3');
        if(Memory_Email_Toggle) sendEmailsBro(result, currentDate);
        Memory_Available_Recently = true;
      } else if(Memory_Available_Recently) {
        Memory_Available_Recently=false;
        console.log(currentDate, '>> searching ... ');
      } else {
        //console.log(currentDate, ' >> khatam / tata / bye bye');
      }
      if(Memory_Error_Recently) {
        console.log(currentDate, `>> connection established`);
        Memory_Error_Recently = false;
      }
    })
    .catch(e => {
      if(!Memory_Error_Recently) {
        console.error(currentDate, `<< connection lost >>`);
        Memory_Error_Recently = true;
      }
      //shit happens lmao
    });
}

console.log(`\nInitialising Software ....\n`);
console.log(`audio check`, Memory_Sound_Toggle);
console.log('email check', Memory_Email_Toggle);
console.log(`${Memory_Emails.length} emails in list`);
console.log('server up @ http://localhost:8080');
//runThisShit();
setInterval(runThisShit, 5000);