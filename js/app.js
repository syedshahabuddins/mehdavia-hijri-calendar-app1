// Calendar + Firebase integration (auth, roles, events)
(function(){
  const hijriMonths = ["Muharram","Safar","Rabiʿ I","Rabiʿ II","Jumada I","Jumada II","Rajab","Shaʿban","Ramadan","Shawwal","Dhu al-Qiʿdah","Dhu al-Hijjah"];

  function toJulianDay(y,m,d){
    var a = Math.floor((14 - m) / 12);
    var y2 = y + 4800 - a;
    var m2 = m + 12*a - 3;
    var jd = d + Math.floor((153*m2 + 2)/5) + 365*y2 + Math.floor(y2/4) - Math.floor(y2/100) + Math.floor(y2/400) - 32045;
    return jd;
  }

  function jdnToIslamic(jd){
    var jdFloor = Math.floor(jd) + 0.5;
    var days = Math.floor(jdFloor) - 1948440 + 10632;
    var n = Math.floor((days - 1) / 10631);
    days = days - 10631 * n + 354;
    var j = (Math.floor((10985 - days) / 5316)) * (Math.floor((50 * days)/17719)) + (Math.floor(days/5670)) * (Math.floor((43*days)/15238));
    days = days - (Math.floor((30 - j)/15)) * (Math.floor((17719*j)/50)) - (Math.floor(j/16)) * (Math.floor((15238*j)/43)) + 29;
    var month = Math.floor((24*days)/709);
    var day = days - Math.floor((709*month)/24);
    var year = 30*n + j - 30;
    return { year: year, month: month, day: day };
  }

  function gregorianToHijri(y,m,d){
    var jd = toJulianDay(y,m,d);
    return jdnToIslamic(jd);
  }

  // DOM helpers and rendering
  const calendarEl = document.getElementById('calendar');
  const monthLabel = document.getElementById('monthLabel');
  let view = { year: new Date().getFullYear(), month: new Date().getMonth() };

  function render(){
    calendarEl.innerHTML = '';
    const year = view.year; const month = view.month; // month: 0-based
    const firstDayWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const gMonthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    monthLabel.textContent = `${gMonthNames[month]} ${year}`;

    // leading blanks
    for(let i=0;i<firstDayWeekday;i++){
      const d = document.createElement('div'); d.className = 'day empty'; calendarEl.appendChild(d);
    }

    for(let d=1; d<=daysInMonth; d++){
      const dayEl = document.createElement('div'); dayEl.className = 'day';
      const gEl = document.createElement('div'); gEl.className = 'greg'; gEl.textContent = d;

      const gYear = year; const gMonth = month + 1; // 1-based for conversion
      const hijri = gregorianToHijri(gYear, gMonth, d);
      const hEl = document.createElement('div'); hEl.className = 'hijri';
      hEl.textContent = `${hijri.day} ${hijriMonths[hijri.month - 1]} ${hijri.year}`;

      dayEl.appendChild(gEl);
      dayEl.appendChild(hEl);
      calendarEl.appendChild(dayEl);
    }
  }

  function changeMonth(delta){
    view.month += delta;
    if(view.month < 0){ view.month = 11; view.year -= 1 }
    if(view.month > 11){ view.month = 0; view.year += 1 }
    render();
  }

  document.getElementById('prev').addEventListener('click',()=>changeMonth(-1));
  document.getElementById('next').addEventListener('click',()=>changeMonth(1));
  document.getElementById('today').addEventListener('click',()=>{ const now = new Date(); view.year = now.getFullYear(); view.month = now.getMonth(); render(); });

  document.getElementById('fullscreen').addEventListener('click', ()=>{
    if(!document.fullscreenElement){ document.documentElement.requestFullscreen().catch(()=>{}); document.body.classList.add('kiosk') }
    else { document.exitFullscreen().catch(()=>{}); document.body.classList.remove('kiosk') }
  });

  // keyboard navigation (left/right), F for fullscreen, D-pad support for TV remotes
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') changeMonth(-1);
    if(e.key === 'ArrowRight') changeMonth(1);
    if(e.key === 'f' || e.key === 'F') document.getElementById('fullscreen').click();
    
    // TV Remote D-pad navigation: allow arrow keys to focus/navigate form elements
    const focusableElements = document.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const currentElement = document.activeElement;
    const currentIndex = Array.from(focusableElements).indexOf(currentElement);
    
    if(e.key === 'ArrowDown' && focusableElements.length > 0){
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % focusableElements.length;
      focusableElements[nextIndex].focus();
    }
    if(e.key === 'ArrowUp' && focusableElements.length > 0){
      e.preventDefault();
      const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
      focusableElements[prevIndex].focus();
    }
    
    // Enter key already triggers buttons/forms, so no extra handling needed
  });

  // Firebase integration (if available)
  const signInBtn = document.getElementById('signIn');
  const signOutBtn = document.getElementById('signOut');
  const userInfoDiv = document.getElementById('userInfo');
  const signedOutDiv = document.getElementById('signedOut');
  const userNameSpan = document.getElementById('userName');
  const userDashboard = document.getElementById('userDashboard');
  const adminDashboard = document.getElementById('adminDashboard');
  const masterDashboard = document.getElementById('masterDashboard');

  // helpers for timezone select
  function populateTimezones(selectEl){
    const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [Intl.DateTimeFormat().resolvedOptions().timeZone];
    zones.forEach(z=>{ const o = document.createElement('option'); o.value=z; o.textContent=z; selectEl.appendChild(o) });
  }
  populateTimezones(document.getElementById('tzSelect'));

  // Minimal Firestore-driven role & event logic
  if(typeof firebase !== 'undefined' && firebase && firebase.auth){
    const auth = firebase.auth();
    const db = firebase.firestore();

    signInBtn && signInBtn.addEventListener('click', ()=>{
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider).catch(err=>console.error(err));
    });

    signOutBtn && signOutBtn.addEventListener('click', ()=> auth.signOut());

    auth.onAuthStateChanged(async user => {
      if(user){
        userInfoDiv.style.display='inline-block';
        signedOutDiv.style.display='none';
        userNameSpan.textContent = user.displayName || user.email;

        const userRef = db.collection('users').doc(user.uid);
        const snap = await userRef.get();
        if(!snap.exists){
          const role = (user.email === 'syedshahabuddins@gmail.com') ? 'master_admin' : 'user';
          await userRef.set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            role: role,
            adminId: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            hijriAdjustment: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          const data = snap.data();
          if(user.email === 'syedshahabuddins@gmail.com' && data.role !== 'master_admin'){
            await userRef.update({ role: 'master_admin' });
          }
        }

        const userDoc = (await userRef.get()).data();
        setupForUser(user, userDoc);
      } else {
        userInfoDiv.style.display='none';
        signedOutDiv.style.display='inline-block';
        userNameSpan.textContent='';
        showRoleUI(null);
      }
    });

    // Event form
    const addEventForm = document.getElementById('addEventForm');
    addEventForm && addEventForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const form = e.target; const title = form.title.value; const date = form.date.value;
      const user = auth.currentUser; if(!user) return alert('Sign in first');
      await db.collection('events').add({ title, date, ownerId: user.uid, createdBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      form.reset();
    });

    // Add holiday (master)
    const addHolidayForm = document.getElementById('addHolidayForm');
    addHolidayForm && addHolidayForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); const title = e.target.title.value; const date = e.target.date.value; const user = auth.currentUser; if(!user) return;
      await db.collection('holidays').add({ title, date, createdBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      e.target.reset();
    });

    // Save settings
    document.getElementById('saveSettings') && document.getElementById('saveSettings').addEventListener('click', async ()=>{
      const tz = document.getElementById('tzSelect').value; const adj = parseInt(document.getElementById('hijriAdjust').value || '0',10);
      const user = auth.currentUser; if(!user) return;
      await db.collection('users').doc(user.uid).update({ timezone: tz, hijriAdjustment: adj });
      alert('Saved');
    });

    // Listen for events for the signed-in user (and refresh dashboard lists)
    let eventsUnsub = null;
    async function setupForUser(firebaseUser, userDoc){
      showRoleUI(userDoc);

      // subscribe to user's events
      if(eventsUnsub) eventsUnsub();
      eventsUnsub = db.collection('events').where('ownerId','==', firebaseUser.uid).orderBy('date').onSnapshot(snap=>{
        const container = document.getElementById('yourEvents'); container.innerHTML='';
        snap.forEach(doc=>{
          const data = doc.data(); const row = document.createElement('div'); row.textContent = `${data.date} — ${data.title}`; container.appendChild(row);
        });
      });

      // If admin, show managed users
      if(userDoc.role === 'admin'){
        db.collection('users').where('adminId','==', firebaseUser.uid).onSnapshot(snap=>{
          const c = document.getElementById('managedUsers'); c.innerHTML='';
          snap.forEach(doc=>{
            const u = doc.data();
            const el = document.createElement('div');
            el.innerHTML = `<strong>${u.displayName||u.email}</strong> — TZ: ${u.timezone || 'n/a'} — Hijri adj: ${u.hijriAdjustment||0} <button data-uid="${u.uid}" class="promote">Adjust Hijri</button> <button data-uid="${u.uid}" class="addEventFor">Add Event For User</button>`;
            c.appendChild(el);
          });
          // event delegation
          c.querySelectorAll('.promote').forEach(btn=> btn.addEventListener('click', async (ev)=>{
            const uid = ev.target.dataset.uid; const adj = prompt('Enter hijri adjustment (days) for this user:', '0'); if(adj===null) return; await db.collection('users').doc(uid).update({ hijriAdjustment: parseInt(adj,10)||0 });
          }));
          c.querySelectorAll('.addEventFor').forEach(btn=> btn.addEventListener('click', async (ev)=>{
            const uid = ev.target.dataset.uid; const title = prompt('Event title:'); const date = prompt('Event date (YYYY-MM-DD):'); if(!title||!date) return; await db.collection('events').add({ title, date, ownerId: uid, createdBy: firebaseUser.uid, adminId: firebaseUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
          }));
        });
      }

      // If master admin, show all users
      if(userDoc.role === 'master_admin'){
          const functionsClient = firebase.functions();
          db.collection('users').onSnapshot(snap=>{
            const c = document.getElementById('allUsers'); c.innerHTML='';
            snap.forEach(doc=>{
              const u = doc.data();
              const el = document.createElement('div');
              el.innerHTML = `<strong>${u.displayName||u.email}</strong> — Role: ${u.role||'user'} <button data-uid="${u.uid}" class="makeAdmin">Make Admin</button> <button data-uid="${u.uid}" class="makeMaster">Make Master</button>`;
              c.appendChild(el);
            });
            c.querySelectorAll('.makeAdmin').forEach(btn=> btn.addEventListener('click', async (ev)=>{ 
              const uid = ev.target.dataset.uid;
              try{
                const setRole = functionsClient.httpsCallable('setRole');
                await setRole({ uid, role: 'admin' });
                alert('Role change requested: admin');
              }catch(err){ console.error(err); alert('Error setting role: '+err.message); }
            }));
            c.querySelectorAll('.makeMaster').forEach(btn=> btn.addEventListener('click', async (ev)=>{ 
              const uid = ev.target.dataset.uid;
              try{
                const setRole = functionsClient.httpsCallable('setRole');
                await setRole({ uid, role: 'master_admin' });
                alert('Role change requested: master_admin');
              }catch(err){ console.error(err); alert('Error setting role: '+err.message); }
            }));
          });
        }
    }

    function showRoleUI(userDoc){
      // hide all
      userDashboard.style.display='none'; adminDashboard.style.display='none'; masterDashboard.style.display='none';
      if(!userDoc) return; // not signed in
      if(userDoc.role === 'user') userDashboard.style.display='block';
      if(userDoc.role === 'admin') { adminDashboard.style.display='block'; userDashboard.style.display='block'; }
      if(userDoc.role === 'master_admin') { masterDashboard.style.display='block'; adminDashboard.style.display='block'; userDashboard.style.display='block'; }
      // populate settings
      document.getElementById('hijriAdjust').value = userDoc.hijriAdjustment || 0;
      const tzSelect = document.getElementById('tzSelect'); if(userDoc.timezone) tzSelect.value = userDoc.timezone;
    }

  } else {
    // Firebase not configured — show signed out UI and render calendar only
    document.getElementById('signedOut').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
  }

  // ANNOUNCEMENTS, PRAYER TIMES, CLOCKS

  // Announcements: listen and render
  async function loadAnnouncementsFor(userDoc){
    if(!userDoc) return;
    const container = document.createElement('div');
    container.id = 'announcementsContainer';
    const mainEl = document.querySelector('main');
    mainEl.insertBefore(container, mainEl.firstChild);

    const q = db.collection('announcements').orderBy('createdAt','desc');
    q.onSnapshot(snap=>{
      container.innerHTML = '';
      snap.forEach(doc=>{
        const a = doc.data();
        // show if global, or admin-scoped to this user's admin, or owner-scoped
        if(a.scope === 'global' || (a.scope === 'admin' && a.adminId && a.adminId === userDoc.adminId) || (a.scope === 'user' && a.ownerId === userDoc.uid) || userDoc.role === 'master_admin'){
          const el = document.createElement('div'); el.className = 'announcement';
          el.innerHTML = `<strong>${a.title}</strong><div>${a.message}</div><small>${new Date(a.createdAt&&a.createdAt.toDate? a.createdAt.toDate() : Date.now()).toLocaleString()}</small>`;
          container.appendChild(el);
        }
      });
    });
  }

  // Admin & master announcement forms
  const adminAnnouncementForm = document.getElementById('adminAnnouncementForm');
  adminAnnouncementForm && adminAnnouncementForm.addEventListener('submit', async (e)=>{
    e.preventDefault(); const form = e.target; const title = form.title.value; const message = form.message.value; const user = auth.currentUser; if(!user) return;
    await db.collection('announcements').add({ title, message, scope: 'admin', adminId: user.uid, createdBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    form.reset();
  });

  const masterAnnouncementForm = document.getElementById('masterAnnouncementForm');
  masterAnnouncementForm && masterAnnouncementForm.addEventListener('submit', async (e)=>{
    e.preventDefault(); const form = e.target; const title = form.title.value; const message = form.message.value; const user = auth.currentUser; if(!user) return;
    await db.collection('announcements').add({ title, message, scope: 'global', createdBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    form.reset();
  });

  // Admin custom prayer timings form
  const customPrayerForm = document.getElementById('customPrayerForm');
  customPrayerForm && customPrayerForm.addEventListener('submit', async (e)=>{
    e.preventDefault(); const form = e.target; const uid = form.uid.value; const times = { Fajr: form.Fajr.value, Dhuhr: form.Dhuhr.value, Asr: form.Asr.value, Maghrib: form.Maghrib.value, Isha: form.Isha.value };
    await db.collection('users').doc(uid).update({ customPrayerTimes: times });
    alert('Saved custom prayer times for user ' + uid);
    form.reset();
  });

  // Prayer times fetching (Aladhan) and countdown
  let prayerTimer = null;
  async function fetchPrayerTimes(lat, lon, timezone){
    try{
      const ts = Math.floor(Date.now()/1000);
      const url = `https://api.aladhan.com/v1/timings/${ts}?latitude=${lat}&longitude=${lon}&method=2&timezonestring=${encodeURIComponent(timezone||Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
      const res = await fetch(url);
      const j = await res.json();
      if(j && j.data && j.data.timings) return j.data.timings;
    }catch(err){ console.warn('Prayer API error', err); }
    return null;
  }

  function parseTimeToDate(timeStr){
    // timeStr like "05:12 (GMT)" or "05:12"
    const m = timeStr.match(/(\d{1,2}:\d{2})/);
    if(!m) return null;
    const [hh,mm] = m[1].split(':').map(n=>parseInt(n,10));
    const now = new Date();
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    return dt;
  }

  function startPrayerCountdown(timings, userDoc){
    // find next prayer from order
    const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    function computeNext(){
      const now = new Date();
      let nextName = null; let nextTime = null;
      for(const name of order){
        let t = timings[name];
        if(!t) continue;
        if(userDoc && userDoc.customPrayerTimes && userDoc.customPrayerTimes[name]){
          t = userDoc.customPrayerTimes[name];
        }
        const dt = parseTimeToDate(t);
        if(dt && dt.getTime() > now.getTime()){ nextName = name; nextTime = dt; break; }
      }
      if(!nextName){ // next day -> take Fajr of next day
        const name = 'Fajr'; let t = timings[name]; if(userDoc && userDoc.customPrayerTimes && userDoc.customPrayerTimes[name]) t = userDoc.customPrayerTimes[name];
        const dt = parseTimeToDate(t);
        if(dt) dt.setDate(dt.getDate() + 1);
        nextName = 'Fajr'; nextTime = dt;
      }
      return { nextName, nextTime };
    }

    function updateCountdown(){
      const n = computeNext();
      if(n.nextTime){
        const diff = n.nextTime.getTime() - Date.now();
        const s = Math.max(0, Math.floor(diff/1000));
        const hh = Math.floor(s/3600); const mm = Math.floor((s%3600)/60); const ss = s%60;
        document.getElementById('nextPrayerName').textContent = n.nextName;
        document.getElementById('nextPrayerTime').textContent = n.nextTime.toLocaleTimeString();
        document.getElementById('prayerCountdown').textContent = `${hh}h ${mm}m ${ss}s`;
      }
    }

    if(prayerTimer) clearInterval(prayerTimer);
    updateCountdown();
    prayerTimer = setInterval(updateCountdown,1000);
  }

  // Hook into user setup: load announcements and prayer times
  const originalSetupForUser = setupForUser;
  setupForUser = async function(firebaseUser, userDoc){
    originalSetupForUser(firebaseUser, userDoc);
    // load announcements
    loadAnnouncementsFor(userDoc);

    // if user wants geolocation, try to get position and update user doc
    if(userDoc.useGeo || document.getElementById('useGeo') && document.getElementById('useGeo').checked){
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(async pos=>{
          const lat = pos.coords.latitude; const lon = pos.coords.longitude;
          await db.collection('users').doc(firebaseUser.uid).update({ lat, lon });
          const timings = await fetchPrayerTimes(lat, lon, userDoc.timezone);
          if(timings) startPrayerCountdown(timings, userDoc);
        }, async err=>{
          // fallback to stored lat/lon
          if(userDoc.lat && userDoc.lon){ const timings = await fetchPrayerTimes(userDoc.lat, userDoc.lon, userDoc.timezone); if(timings) startPrayerCountdown(timings, userDoc); }
        });
      }
    } else {
      if(userDoc.lat && userDoc.lon){ const timings = await fetchPrayerTimes(userDoc.lat, userDoc.lon, userDoc.timezone); if(timings) startPrayerCountdown(timings, userDoc); }
    }

    // Listen to announcements already happens in loadAnnouncementsFor

    // Setup announcement forms only when role matches
  };

  // Clocks (digital + analog) for TV users
  const digitalClockEl = document.getElementById('digitalClock');
  const analogCanvas = document.getElementById('analogClock');
  const clockTypeSelect = document.getElementById('clockTypeSelect');

  function updateDigitalClock(){
    const now = new Date();
    digitalClockEl.textContent = now.toLocaleTimeString();
  }

  let analogReq = null;
  function drawAnalog(){
    if(!analogCanvas) return;
    const ctx = analogCanvas.getContext('2d');
    const w = analogCanvas.width = analogCanvas.offsetWidth;
    const h = analogCanvas.height = analogCanvas.offsetHeight;
    const r = Math.min(w,h)/2 - 8;
    ctx.clearRect(0,0,w,h);
    ctx.save(); ctx.translate(w/2,h/2);
    // circle
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=4; ctx.stroke();
    const now = new Date();
    const sec = now.getSeconds(); const min = now.getMinutes()+sec/60; const hr = (now.getHours()%12)+min/60;
    // hour
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(hr/6*Math.PI - Math.PI/2)*r*0.5, Math.sin(hr/6*Math.PI - Math.PI/2)*r*0.5); ctx.strokeStyle='#fff'; ctx.lineWidth=6; ctx.stroke();
    // minute
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(min/30*Math.PI - Math.PI/2)*r*0.72, Math.sin(min/30*Math.PI - Math.PI/2)*r*0.72); ctx.lineWidth=4; ctx.stroke();
    // second
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(sec/30*Math.PI - Math.PI/2)*r*0.85, Math.sin(sec/30*Math.PI - Math.PI/2)*r*0.85); ctx.strokeStyle=varGet('--accent', '#60a5fa'); ctx.lineWidth=2; ctx.stroke();
    ctx.restore();
    analogReq = requestAnimationFrame(drawAnalog);
  }

  function varGet(name, fallback){
    try{ return getComputedStyle(document.documentElement).getPropertyValue(name) || fallback; }catch(e){ return fallback; }
  }

  // Start clock updates when on large screen
  function startClocks(){
    if(window.innerWidth < 1200) { document.querySelector('.clock-area').style.display='none'; return; }
    document.querySelector('.clock-area').style.display='flex';
    updateDigitalClock(); setInterval(updateDigitalClock,1000);
    if(clockTypeSelect && clockTypeSelect.value === 'analog'){ drawAnalog(); } else { if(analogReq) cancelAnimationFrame(analogReq); if(analogCanvas) analogCanvas.getContext && analogCanvas.getContext('2d').clearRect(0,0,analogCanvas.width,analogCanvas.height); }
  }
  clockTypeSelect && clockTypeSelect.addEventListener('change', ()=>{ localStorage.setItem('clockType', clockTypeSelect.value); startClocks(); });
  // restore
  const saved = localStorage.getItem('clockType') || 'digital'; if(clockTypeSelect) clockTypeSelect.value = saved;
  window.addEventListener('resize', startClocks);
  startClocks();

  // ensure announcements and prayer flows have access to db/auth
  // initial render
  render();

})();
