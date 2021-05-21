const fetch = require('node-fetch');

const KURUKSHETRA_ID = 186;

let getTodayDate = () => {

  let today = new Date();
  let dd = today.getDate();

  let mm = today.getMonth() + 1;
  let yyyy = today.getFullYear();
  if (dd < 10) {
    dd = '0' + dd;
  }

  if (mm < 10) {
    mm = '0' + mm;
  }
  return dd + '-' + mm + '-' + yyyy;
}

let currentDate = getTodayDate();


let url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${KURUKSHETRA_ID}&date=${currentDate}`;

let settings = { method: "GET",
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36'
  } };

fetch(url, settings)
  .then(res => res.json())
  .then((json) => {
    let centers = json.centers;
    for(let i=0; i<centers.length; i++) {
      let sessionName = centers[i].name;
      let sessions = centers[i].sessions;
      for (let j=0; j<sessions.length; j++) {
        let available = +sessions[j].available_capacity;
        let date = sessions[j].date;
        console.log(`${sessionName}@${date} -- ${available}`);
      }
    }
});