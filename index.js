require('dotenv').config();
const fetch = require('node-fetch');
var nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
var player = require('play-sound')(opts = { player: process.env.MUSIC_PLAYER });

/* 
Memory_Emails will include all the emails that need to be notified.. Initiated on first run, and updated OTG as required.
Structure ::
['email@zoho.com', 'more@gmail.com']
*/
var Memory_Emails = require('./RECEIVER_EMAILS.json').emails;

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

const KURUKSHETRA_ID = 186;

const startingEmail = `<div style="background: red;">&nbsp;</div>
<div style="background: red;">&nbsp;</div>
<div style="background: red;">&nbsp;</div>
<h2 style="text-align: center;">Haryana Government Social Services .com</h2>
<h4 style="text-align: center;">Vacc Notifier&copy;</h4>
<div style="background: red;">&nbsp;</div>
<hr />
<h4>Hello Dear,</h4>`;

const slotsAvailableGreeting = `<h4>Saste Nashe is available in your area... Go enjoy:</h4><h4>&nbsp;</h4>`;

const bookSlotCallToAction = `<p>&nbsp;</p>
<h2><em>Please visit website: <a href="https://selfregistration.cowin.gov.in"><span style="background-color: #ffff00;">COWIN.GOV.IN</span></a> to book your slot now!</em></h2>
<p>&nbsp;</p>`;

let sudhaImg = `https://pbs.twimg.com/profile_images/485331283166244864/tUuqIX-R_400x400.jpeg`;
let ourFoto = `https://lh3.googleusercontent.com/Xk7ehWAAkAHDt4HFScwbiuJRr51ykzPa3A-HTGg0IlbtW2w4mf-9F1AL7xKxLXb8iVM1b5j7gTjcV13eTBM-Xa20Z6AQYf4puhUKd5AabKFQ58nN_LVJSFYyIN6eVJE-vUyRbFDYBrgVQId7aYkkFJLmGT8EBFzJ86mkuAmSHFXe8wYk--iJ-U9mJqtdIFakiduqYsFerPmlQYuMXx2QDkT0_mN6KFIvn3F6Jza0qd09cFz69jO-Ee8Diq7TF9EeHCQ9HsUBx1QpZAVUFNl7zpONazjKe3qQuBFP93Vi54HydyhWrpUmD_7ieZdTdGXi7hiygMgAHRMWmB7mJsNEIsRi8zfNVUY55FMGLrc6hikI2RVHXCO_h_6GWOMM6lNFs5E77bpKKyd7pz5oYYac8vjl3enCcEicCwVCMeDRWwxLoEjQzNgNxdTgw8Pldn_ODvOSuFPCvAXsXOuuJloGq-cg0tz_krKfU-R-RgTA-FqoriyLXIXJEKB4awOkZvQpim9etHTI1T37wkPgPVO8QMviprant0hpwzDKLZsPDL9b17W9HEsjZEPaskfQtd4M3OBjQpqCx3r5TZ621KQk2SeXhzgnrxhdEB09IXirnj-nMJCakULYn22cwuS_kps5bXuypvChu-NOcI8Clyzd_8XNaY7dSCd9GePPQwqI1IsBeE-X9jXCH9fBvvivJq0cGNxNKwSLNCcUmqTRVvNRITAlxQ=w1288-h966-no?authuser=0`;
//sudha image dimensions: 220 220

const closingEmail = `<h3><em>Yours Truly,</em></h3>
<!--<h2>Kurukshetra Development Board</h2>-->
<p><img src="${ourFoto}" alt="" width="380" height="285" /></p>
<p><em>Ayy LMAO</em></p>
<div style="background: red;">&nbsp;</div>
<hr />
<p style="text-align: left;"><strong><em>Powered by Microsoft&trade; Azure Secure Services.</em></strong></p>`
/*
//add new email to json:
console.log(Memory_Emails);
Memory_Emails.push('punyakant.yahoo.com');
let jsonToWrite = {
  emails: Memory_Emails
}
fs.writeFile(path.resolve(__dirname,'RECEIVER_EMAILS.json'), JSON.stringify(jsonToWrite), err => {
  if(err) {
    console.error(`URGENT >> ${Memory_Emails[Memory_Emails.length - 1]} was not added to JSON. Manual Action required.`);
    // todo: send Error to admin emails. 
  }
});
*/


var transporter = nodemailer.createTransport({
  host: process.env.MAIL_SMTP_SERVER,
  port: process.env.MAIL_SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.MAILID,
    pass: process.env.MAIL_APPLICATION_PASSWORD
  },
  tls: {
    ciphers: 'SSLv3'
  }
});




let sendEmailsBro = (result, currentDate) => {
  console.log(currentDate, ' >> Sending Emails.. found something I guess.');
  if (!(result.length && result.length > 0)) return;
  let emailBody = startingEmail + slotsAvailableGreeting;
  for (let i = 0; i < result.length; i++) {
    emailBody += `<h4>${i + 1}. ${result[i]}</h4>`;
  }
  emailBody += bookSlotCallToAction + closingEmail;

  var mailOptions = {
    from: '"Kurukshetra Vacc Notifier" <covid_notifier@zohomail.in>',
    to: Memory_Emails.toString(),
    subject: `Available Centers: ${result.length}`,
    html: emailBody
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log(`Emails sent to ${Memory_Emails.length} emails`);
    }
  });
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


let runThisShit = () => {
  let result = [];
  let currentDate = getTodayDate();

  let url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${KURUKSHETRA_ID}&date=${currentDate[0]}`;

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
            }     
          }
          //console.log(`${sessionName}@${date} -- ${available}`);
        }
      }
      //console.log(`Total available centers with vaccines: ${result.length}`);
      //result.push(`Sorry bro no nashe available at the moment. <b>Ghar raho. Safe raho.</b>`);
      if (result.length > 0) {
        player.play('doorbell.mp3');
        sendEmailsBro(result, currentDate);
        Memory_Available_Recently = true;
      } else if(Memory_Available_Recently) {
        Memory_Available_Recently=false;
      }
    })
    .catch(e => {
      //shit happens lmao
    });
}
console.log(getTodayDate(), ` >> Searching ....`);
//runThisShit();
setInterval(runThisShit, 5000);