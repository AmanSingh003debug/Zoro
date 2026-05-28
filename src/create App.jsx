import { useState, useEffect } from "react";

/* ── HELPERS ── */
const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toTime = (m) => { const h = Math.floor(m / 60) % 24; const min = m % 60; return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`; };
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

/* ── DATA ── */
const CREW = [
  { name:"Luffy",  trait:"Vision",     color:"#FF6B35", shadow:"#FF6B3555", img:"https://upload.wikimedia.org/wikipedia/en/1/1f/Monkey_D_Luffy_anime_pre_timeskip_design.png" },
  { name:"Zoro",   trait:"Discipline", color:"#2ECC71", shadow:"#2ECC7155", img:"https://upload.wikimedia.org/wikipedia/en/5/56/Roronoa_Zoro_anime_pre_timeskip_design.png" },
  { name:"Nami",   trait:"Strategy",   color:"#F39C12", shadow:"#F39C1255", img:"https://upload.wikimedia.org/wikipedia/en/3/38/Nami_anime_pre_timeskip_design.png" },
  { name:"Robin",  trait:"Patience",   color:"#9B59B6", shadow:"#9B59B655", img:"https://upload.wikimedia.org/wikipedia/en/8/82/Nico_Robin_anime_pre_timeskip_design.png" },
];

const RULES = [
  { icon:"⚔️", title:"Web Dev before entertainment.", body:"The reward comes after the work. No IPL before the study block is done." },
  { icon:"📖", title:"Exam prep is non-negotiable.", body:"Even on exhausted days. PYQs only. 15 min minimum on the worst days." },
  { icon:"⏱", title:"Gym ≤ 70 min on weekdays.", body:"Overtrain and you drain your study energy. Tight beats long." },
  { icon:"📵", title:"Phone face-down at study time.", body:"One distraction kills the whole block. Silence it before you sit." },
  { icon:"🗺️", title:"Sunday = weekly reset.", body:"20 min honest review. What actually happened vs what you planned." },
];

/* ── SCHEDULE ENGINE ── */
const buildSchedule = (user) => {
  const { name, wakeTime, workStart, workEnd, gymDays, priorities, bedTime } = user;
  const today = new Date().toLocaleDateString("en-US",{weekday:"short"}).slice(0,3);
  const isGym = gymDays.includes(today);
  const isWeekend = today === "Sat" || today === "Sun";
  const wake = toMins(wakeTime), workS = toMins(workStart), workE = toMins(workEnd);
  const bed = toMins(bedTime) < wake ? toMins(bedTime)+1440 : toMins(bedTime);
  let s = [];

  if (isWeekend) {
    s = [
      { emoji:"☀️", tag:"REST",   color:"#6B7280", label:"Rest — No Alarm",           time:"Wake naturally",                 detail:`${name}'s recovery day. Sleep in — your body earns this.` },
      { emoji:"📖", tag:"EXAM",   color:"#D97706", label:"Exam Heavy Block",           time:"Morning",                        detail:`${Math.round((priorities.exam||30)*1.5)} mins of PYQs. No theory.` },
      { emoji:"💻", tag:"WEB DEV",color:"#059669", label:"Web Dev Build Session",      time:"Afternoon",                      detail:`${Math.round((priorities.webdev||60)*1.5)} mins. Ship something real.` },
      { emoji:"🏋️", tag:"GYM",    color:"#DC2626", label:"Big Gym Session",            time:"Evening",                        detail:"75–90 min. Your long session — make it count." },
      { emoji:"🗺️", tag:"REVIEW", color:"#4F46E5", label:"Navigator's Log",            time:"Sunday night",                   detail:`20 min, ${name}. Honest review. Adjust your course.` },
    ];
  } else {
    if (workS - wake >= 120) s.push({ emoji:"💻", tag:"STUDY",   color:"#059669", label:"Morning Power Block", time:`${toTime(wake+30)} – ${toTime(workS-30)}`, detail:`${name}'s best brain hours. Use them before work starts.` });
    s.push({ emoji:"⚓", tag:"WORK",    color:"#1D4ED8", label:"Work",              time:`${workStart} – ${workEnd}`,         detail:"Job mode. Handle tickets, grow skills, stay sharp." });
    let c = workE+30;
    s.push({ emoji:"🍖", tag:"REST",    color:"#6B7280", label:"Dock & Recharge",  time:`${toTime(c)} – ${toTime(c+30)}`,   detail:"Dinner, freshen up. 10-min nap max." }); c+=30;
    if ((priorities.webdev||0)>0) { s.push({ emoji:"💻", tag:"WEB DEV",color:"#059669", label:"Web Dev Block",    time:`${toTime(c)} – ${toTime(c+priorities.webdev)}`, detail:`${name}'s focused build session. Phone face-down.` }); c+=priorities.webdev; }
    if ((priorities.exam||0)>0)   { s.push({ emoji:"📖", tag:"EXAM",   color:"#D97706", label:"Exam Prep",        time:`${toTime(c)} – ${toTime(c+priorities.exam)}`,   detail:"PYQs only. Alternate subjects daily." }); c+=priorities.exam; }
    if (isGym)                     { s.push({ emoji:"🏋️", tag:"GYM",    color:"#DC2626", label:"Gym",              time:`${toTime(c)} – ${toTime(c+70)}`,                detail:"70 min max weekdays. Focused, not long." }); c+=70; }
    else if ((priorities.dsa||0)>0){ s.push({ emoji:"🧠", tag:"DSA",    color:"#7C3AED", label:"DSA Practice",     time:`${toTime(c)} – ${toTime(c+priorities.dsa)}`,    detail:"1–2 problems. Consistency beats intensity." }); c+=priorities.dsa; }
    const bedD = bed>1440?bed-1440:bed;
    if (c < bed-30) s.push({ emoji:"📺", tag:"FREE",   color:"#374151", label:"Free Time",       time:`${toTime(c)} – ${toTime(bedD-30)}`,      detail:`${name} earned it. IPL, anime — guilt-free.` });
    s.push({ emoji:"😴", tag:"SLEEP",  color:"#111827", label:"Sleep",            time:bedTime,                              detail:"No scrolling. Lock in. Rest is the recovery arc." });
  }
  return s;
};

/* ═══════════════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════════════ */
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name:"", wakeTime:"07:00", workStart:"09:00", workEnd:"18:00", gymDays:["Mon","Wed","Fri"], priorities:{webdev:60,exam:30,dsa:45}, bedTime:"23:30" });
  const [animating, setAnimating] = useState(false);

  const go = (n) => { setAnimating(true); setTimeout(() => { setStep(n); setAnimating(false); }, 250); };

  const finish = () => {
    const u = { ...data, joinDate: new Date().toLocaleDateString("en-IN") };
    safeSet("glUser", JSON.stringify(u));
    onDone(u);
  };

  const toggleGym = (d) => setData(p => ({ ...p, gymDays: p.gymDays.includes(d) ? p.gymDays.filter(x=>x!==d) : [...p.gymDays,d] }));

  const steps = [
    /* 0 — NAME */
    <div key="0">
      <div className="ob-label">Step 1 / 4</div>
      <h2 className="ob-h2">Who sets sail?</h2>
      <p className="ob-sub">Enter your name, Captain.</p>
      <input className="gl-input" placeholder="Your name..." value={data.name} onChange={e=>setData({...data,name:e.target.value})} autoFocus />
      <button className="gl-btn" disabled={!data.name.trim()} onClick={()=>go(1)}>Set Sail →</button>
    </div>,

    /* 1 — TIMINGS */
    <div key="1">
      <div className="ob-label">Step 2 / 4</div>
      <h2 className="ob-h2">Your timings</h2>
      <p className="ob-sub">Your real schedule — no presets.</p>
      {[["WAKE UP","wakeTime"],["WORK STARTS","workStart"],["WORK ENDS","workEnd"],["BEDTIME","bedTime"]].map(([l,k])=>(
        <div key={k}><label className="gl-label">{l}</label><input type="time" className="gl-input" value={data[k]} onChange={e=>setData({...data,[k]:e.target.value})} /></div>
      ))}
      <button className="gl-btn" onClick={()=>go(2)}>Continue →</button>
    </div>,

    /* 2 — GYM DAYS */
    <div key="2">
      <div className="ob-label">Step 3 / 4</div>
      <h2 className="ob-h2">Gym days</h2>
      <p className="ob-sub">Off days become DSA sessions.</p>
      <div className="day-grid">
        {DAYS.map(d=>(
          <div key={d} className={`day-chip${data.gymDays.includes(d)?" active":""}`} onClick={()=>toggleGym(d)}>{d}</div>
        ))}
      </div>
      <button className="gl-btn" onClick={()=>go(3)}>Continue →</button>
    </div>,

    /* 3 — GOALS */
    <div key="3">
      <div className="ob-label">Step 4 / 4</div>
      <h2 className="ob-h2">Daily goals</h2>
      <p className="ob-sub">Minutes per block — be honest.</p>
      {[["WEB DEV","webdev"],["EXAM PREP","exam"],["DSA / CODING","dsa"]].map(([l,k])=>(
        <div key={k}><label className="gl-label">{l}</label><input type="number" min="0" max="300" className="gl-input" value={data.priorities[k]} onChange={e=>setData({...data,priorities:{...data.priorities,[k]:+e.target.value}})} /></div>
      ))}
      <button className="gl-btn" onClick={finish}>🏴‍☠️ Generate My Schedule</button>
    </div>,
  ];

  return (
    <div className="ob-wrap">
      {/* Ocean bg layers */}
      <div className="ob-ocean" />
      <div className="ob-waves" />

      {/* Luffy silhouette */}
      <div className="ob-luffy-wrap">
        <img src="https://upload.wikimedia.org/wikipedia/en/1/1f/Monkey_D_Luffy_anime_pre_timeskip_design.png"
          alt="Luffy" className="ob-luffy-img"
          onError={e=>{e.target.style.display="none";}} />
        <div className="ob-luffy-glow" />
      </div>

      {/* Card */}
      <div className="ob-card">
        <div className="ob-top">
          <div className="ob-skull">☠️</div>
          <div className="ob-brand">STRAW HAT PIRATES</div>
          <div className="ob-title">The Grand Line</div>
        </div>

        {/* Progress */}
        <div className="ob-dots">
          {[0,1,2,3].map(n=><div key={n} className={`ob-dot${step===n?" ob-dot-active":step>n?" ob-dot-done":""}`}/>)}
        </div>

        <div className={`ob-step${animating?" ob-step-out":""}`}>
          {steps[step]}
        </div>

        {step > 0 && <button className="ob-back" onClick={()=>go(step-1)}>← Back</button>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SETTINGS SHEET
═══════════════════════════════════════════════════ */
function Settings({ user, onSave, onClose }) {
  const [d, setD] = useState({...user});
  const toggleGym = (day) => setD(p=>({...p,gymDays:p.gymDays.includes(day)?p.gymDays.filter(x=>x!==day):[...p.gymDays,day]}));
  const save = () => { safeSet("glUser", JSON.stringify(d)); onSave(d); };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle"/>
        <h3 className="sheet-title">⚙️ Update Log</h3>

        <label className="gl-label">Name</label>
        <input className="gl-input dark" value={d.name} onChange={e=>setD({...d,name:e.target.value})}/>

        {[["Wake Time","wakeTime"],["Work Start","workStart"],["Work End","workEnd"],["Bedtime","bedTime"]].map(([l,k])=>(
          <div key={k}><label className="gl-label">{l}</label><input type="time" className="gl-input dark" value={d[k]} onChange={e=>setD({...d,[k]:e.target.value})}/></div>
        ))}

        <label className="gl-label">Gym Days</label>
        <div className="day-grid dark">
          {DAYS.map(day=><div key={day} className={`day-chip${d.gymDays.includes(day)?" active":""}`} onClick={()=>toggleGym(day)}>{day}</div>)}
        </div>

        {[["Web Dev (min)","webdev"],["Exam Prep (min)","exam"],["DSA (min)","dsa"]].map(([l,k])=>(
          <div key={k}><label className="gl-label">{l}</label><input type="number" min="0" max="300" className="gl-input dark" value={d.priorities[k]} onChange={e=>setD({...d,priorities:{...d.priorities,[k]:+e.target.value}})}/></div>
        ))}

        <button className="gl-btn" style={{marginTop:20}} onClick={save}>Save ✓</button>
        <button className="sheet-reset" onClick={()=>{safeSet("glUser","");window.location.reload();}}>🔄 Reset & Start Over</button>
        <button className="sheet-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCHEDULE BLOCK
═══════════════════════════════════════════════════ */
function Block({ item, idx, open, onToggle }) {
  return (
    <div className={`block${open?" block-open":""}`} style={{"--bc":item.color, animationDelay:`${idx*55}ms`}} onClick={()=>onToggle(idx)}>
      <div className="block-row">
        <div className="block-icon">{item.emoji}</div>
        <div className="block-info">
          <div className="block-top">
            <span className="block-label">{item.label}</span>
            <span className="block-tag" style={{color:item.color,borderColor:item.color+"44",background:item.color+"15"}}>{item.tag}</span>
          </div>
          <div className="block-time">🕐 {item.time}</div>
        </div>
        <div className={`block-chevron${open?" open":""}`}>›</div>
      </div>
      <div className="block-detail">
        <p>{item.detail}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("today");
  const [expanded, setExpanded] = useState(null);
  const [settings, setSettings] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = safeGet("glUser");
    if (s) { try { setUser(JSON.parse(s)); } catch {} }
    setLoading(false);
    setTimeout(() => setReady(true), 60);
  }, []);

  if (loading) return null;
  if (!user) return <Onboarding onDone={(u) => { setUser(u); setTimeout(()=>setReady(true),60); }} />;

  const schedule = buildSchedule(user);
  const toggle = (i) => setExpanded(prev => prev===i ? null : i);
  const today = new Date().toLocaleDateString("en-US",{weekday:"long"});
  const dateStr = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});

  return (
    <>
      <div className={`app${ready?" app-ready":""}`}>

        {settings && <Settings user={user} onSave={(u)=>{setUser(u);setSettings(false);}} onClose={()=>setSettings(false)}/>}

        {/* ═══ HERO ═══ */}
        <header className="hero">
          {/* Ocean layers */}
          <div className="hero-ocean"/>
          <div className="hero-foam"/>

          {/* Stars */}
          {[...Array(30)].map((_,i)=>(
            <div key={i} className="star" style={{
              width: i%5===0?3:2, height:i%5===0?3:2,
              top:`${(i*13+7)%72}%`, left:`${(i*17+3)%94}%`,
              animationDuration:`${2+(i%3)}s`, animationDelay:`${(i*0.25)%2}s`
            }}/>
          ))}

          {/* Luffy hero image */}
          <div className="hero-luffy-wrap">
            <div className="hero-luffy-halo"/>
            <img
              src="https://upload.wikimedia.org/wikipedia/en/1/1f/Monkey_D_Luffy_anime_pre_timeskip_design.png"
              alt="Luffy" className="hero-luffy"
              onError={e=>{e.target.style.display="none";}}
            />
          </div>

          {/* Edit btn */}
          <button className="edit-btn" onClick={()=>setSettings(true)}>⚙️ Edit</button>

          {/* Hero text */}
          <div className="hero-content">
            <div className="hero-eyebrow">☠️ Straw Hat Pirates · {user.name}'s Log</div>
            <h1 className="hero-h1">Grand Line<br/>Schedule</h1>
            <p className="hero-date">{today} · {dateStr}</p>

            {/* Crew strip */}
            <div className="crew-strip">
              {CREW.map((c,i)=>(
                <div key={c.name} className="crew-member" style={{animationDelay:`${i*80+300}ms`}}>
                  <div className="crew-avatar" style={{"--cc":c.color,"--cs":c.shadow}}>
                    <img src={c.img} alt={c.name} onError={e=>{e.target.style.display="none";}}/>
                    <div className="crew-ring"/>
                  </div>
                  <div className="crew-name">{c.name}</div>
                  <div className="crew-trait" style={{color:c.color}}>{c.trait}</div>
                </div>
              ))}
            </div>

            {/* Stats pills */}
            <div className="stats-row">
              {[["💻","Web Dev",`${user.priorities.webdev}m`,"#059669"],["📖","Exam",`${user.priorities.exam}m`,"#D97706"],["🏋️","Gym",`${user.gymDays.length}×/wk`,"#DC2626"],["🧠","DSA",`${user.priorities.dsa}m`,"#7C3AED"]].map(([ic,l,v,col])=>(
                <div key={l} className="stat-pill" style={{"--pc":col}}>
                  <span>{ic}</span><span className="stat-l">{l}</span><span className="stat-v">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ═══ NAV ═══ */}
        <nav className="nav">
          {[["today","📅 Today"],["code","⚔️ Code"],["crew","🏴‍☠️ Crew"]].map(([k,l])=>(
            <button key={k} className={`nav-btn${tab===k?" nav-active":""}`} onClick={()=>{setTab(k);setExpanded(null);}}>
              {l}
            </button>
          ))}
        </nav>

        {/* ═══ CONTENT ═══ */}
        <main className="main">

          {/* TODAY */}
          {tab==="today" && (
            <div className="section-anim">
              <div className="section-header">
                <div className="section-eyebrow">Today's Route</div>
                <h2 className="section-h2">{user.name}'s Schedule</h2>
                <p className="section-sub">Tap any block to expand.</p>
              </div>
              {schedule.map((item,i)=>(
                <Block key={i} item={item} idx={i} open={expanded===i} onToggle={toggle}/>
              ))}
            </div>
          )}

          {/* CODE */}
          {tab==="code" && (
            <div className="section-anim">
              <div className="section-header">
                <div className="section-eyebrow">The Pirate Code</div>
                <h2 className="section-h2">Non-Negotiable Rules</h2>
                <p className="section-sub">Break them and you lose your way.</p>
              </div>
              {RULES.map((r,i)=>(
                <div key={i} className="rule-card" style={{animationDelay:`${i*60}ms`}}>
                  <div className="rule-icon">{r.icon}</div>
                  <div>
                    <div className="rule-title">{r.title}</div>
                    <div className="rule-body">{r.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CREW */}
          {tab==="crew" && (
            <div className="section-anim">
              <div className="section-header">
                <div className="section-eyebrow">Your Crew</div>
                <h2 className="section-h2">Straw Hat Pirates</h2>
                <p className="section-sub">Each one a principle. All of them, you.</p>
              </div>
              {CREW.map((c,i)=>(
                <div key={i} className="crew-card" style={{borderColor:c.color+"55","--cc":c.color, animationDelay:`${i*70}ms`}}>
                  <div className="crew-card-avatar" style={{borderColor:c.color+"66",background:c.color+"18"}}>
                    <img src={c.img} alt={c.name} onError={e=>{e.target.style.display="none";}}/>
                  </div>
                  <div>
                    <div className="crew-card-name">{c.name}</div>
                    <div className="crew-card-trait" style={{color:c.color}}>{c.trait}</div>
                    <div className="crew-card-desc">
                      {c.name==="Luffy"  && "Dream relentlessly. The destination justifies every sacrifice."}
                      {c.name==="Zoro"   && "Train every day. One missed session is one step backward."}
                      {c.name==="Nami"   && "Plan smart. A good map beats raw effort every time."}
                      {c.name==="Robin"  && "Be patient. Mastery is built one quiet day at a time."}
                    </div>
                  </div>
                </div>
              ))}
              {/* Captain card */}
              <div className="captain-card">
                <div className="captain-title">⚓ {user.name}'s Captain Card</div>
                <div className="captain-grid">
                  {[["Joined",user.joinDate||"Today"],["Wake Up",user.wakeTime],["Work",`${user.workStart}–${user.workEnd}`],["Gym Days",`${user.gymDays.length}×/week`]].map(([k,v])=>(
                    <div key={k}><div className="captain-key">{k}</div><div className="captain-val">{v}</div></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
