(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const el = (tag, cls) => { const e=document.createElement(tag); if(cls) e.className=cls; return e; };
  const write = (s="") => { const sc=$("#screen"); sc.appendChild(document.createTextNode(s+"\n")); sc.scrollTop = sc.scrollHeight; };
  const prompt = () => $("#prompt").textContent;
  const setPrompt = (p) => $("#prompt").textContent = p;
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const load = (k, d=null) => { try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } };

  const DATA = window.__ELIF_DATA__;
  const FS = new Map(Object.entries(DATA.files));
  const HINTS = DATA.hints;
  const TASKS = DATA.tasks;
  const PHASE_FLAGS = DATA.phaseFlags;
  const NET = DATA.network;
  const FINALFILE = DATA.final_link_file;

  const state = load("elif_state_v1", {
    cwd: "/home/elif",
    phase: 1,
    flags: [],
    hintCount: { "1": 0, "2": 0, "3": 0 },
    artifactPath: null,
    artifactHexView: false,
    finalMounted: false,
    won: false
  });

  function renderObjectives(){
    const obj = $("#obj");
    obj.innerHTML = "";
    const list = [
      `Current: ${TASKS[String(state.phase)]}`,
      `Flags found: ${state.flags.length}`
    ];
    obj.textContent = list.join("\n");
  }
  function toHex(str){
    const bytes = new TextEncoder().encode(str);
    let out = "";
    for(let i=0;i<bytes.length;i++){
      const h = bytes[i].toString(16).padStart(2,'0');
      out += h + ((i+1)%16===0? "\n" : " ");
    }
    return out.trim();
  }
  function renderArtifact(){
    const art = $("#art");
    if(!state.artifactPath){ art.textContent = "(no artifact selected)"; return; }
    const path = state.artifactPath;
    const content = FS.get(path) ?? "";
    art.textContent = state.artifactHexView ? toHex(content) : content;
  }
  function renderSystem(){
    const sys = $("#sys");
    sys.innerHTML = "";
    const kv = document.createElement("div"); kv.className = "kv";
    function row(k,v){ const rk=document.createElement("div"); rk.className="k"; rk.textContent=k; const rv=document.createElement("div"); rv.className="v"; rv.textContent=v; kv.appendChild(rk); kv.appendChild(rv); }
    row("Host", state.phase>=2? NET.host : "local");
    row("Ports", state.phase>=2? NET.open_ports.join(", ") : "—");
    row("Status", state.finalMounted? "fallback shell: ready" : (state.phase>=2? "web service: up" : "idle"));
    sys.appendChild(kv);

    const finalWrap = $("#finalLinks");
    finalWrap.classList.toggle("hidden", !(state.won || state.flags.includes("ELIF{Ana}") || state.flags.includes("ELIF{CBH}")));
  }

  $("#toggleViewBtn").addEventListener("click", ()=>{
    state.artifactHexView = !state.artifactHexView; save("elif_state_v1", state); renderArtifact();
  });
  $("#finalLinks").addEventListener("click", (e)=>{
    if(e.target.classList.contains("copy")){
      const url = e.target.getAttribute("data-url");
      navigator.clipboard.writeText(url).then(()=> write(`Copied: ${url}`));
    }
  });

  function norm(p){
    if(!p) return state.cwd;
    if(!p.startsWith("/")) p = state.cwd.replace(/\/+$/,"") + "/" + p;
    const parts = [];
    for(const seg of p.split("/")){
      if(!seg || seg === ".") continue;
      if(seg === ".."){ parts.pop(); continue; }
      parts.push(seg);
    }
    return "/" + parts.join("/");
  }
  function ls(path){
    path = norm(path);
    const prefix = path.endsWith("/")? path : path + "/";
    const seen = new Set();
    for(const k of FS.keys()){
      if(k.startsWith(prefix)){
        const rest = k.slice(prefix.length);
        const top = rest.split("/")[0];
        if(top && !seen.has(top)){
          seen.add(top);
        }
      } else if (k === path){
        return [ path.split("/").pop() ];
      }
    }
    return Array.from(seen).sort();
  }
  function isFile(path){ return FS.has(path); }
  function ensureFinalMounted(){
    if(!state.finalMounted){
      FS.set(FINALFILE.path, atob(FINALFILE.content_b64));
      state.finalMounted = true;
      save("elif_state_v1", state);
    }
  }

  function doHint(){
    const p = String(state.phase);
    const arr = HINTS[p] || [];
    const n = Math.min(state.hintCount[p], arr.length-1);
    const text = arr[n] || "No hint available.";
    write(text);
    state.hintCount[p] = Math.min(state.hintCount[p]+1, arr.length-1);
    save("elif_state_v1", state);
  }

  const COMMANDS = {
    help(){
      write("Available commands:");
      write("  help, man <cmd>, tasks, hint, clear");
      write("  ls [path], cd <dir>, pwd, cat <file>");
      write("  find <pattern>, grep <pattern> <file>, inspect <file>");
      write("  decode <file|text>");
      write("  scan, curl </path>");
      write("  ritual.stabilize");
      write("  submit ELIF{...}");
    },
    man(args){
      const cmd = args[0];
      const map = {
        help: "/home/elif/.hints/man_help.txt",
        tasks: "/home/elif/.hints/man_tasks.txt",
        decode: "/home/elif/.hints/man_decode.txt"
      };
      if(!cmd || !map[cmd]){ write("No manual entry for that."); return; }
      const path = map[cmd];
      state.artifactPath = path; renderArtifact();
      write(FS.get(path));
    },
    tasks(){
      write(TASKS[String(state.phase)] || "No tasks.");
      renderObjectives();
    },
    hint(){ doHint(); },
    clear(){ $("#screen").innerHTML=""; },
    ls(args){
      const path = args[0] || state.cwd;
      const list = ls(path);
      write(list.length? list.join("  ") : "empty");
    },
    cd(args){
      const target = args[0];
      if(!target){ write("usage: cd <dir>"); return; }
      const path = norm(target);
      const hasChild = Array.from(FS.keys()).some(k => k === path || k.startsWith(path.endsWith("/")? path : path + "/"));
      if(!hasChild){ write("no such file or directory"); return; }
      state.cwd = path; setPrompt(`elif@localhost:${path}$`); save("elif_state_v1", state);
    },
    pwd(){ write(state.cwd); },
    cat(args){
      const target = args[0];
      if(!target){ write("usage: cat <file>"); return; }
      const path = norm(target);
      if(!isFile(path)){ write("no such file"); return; }
      const content = FS.get(path);
      state.artifactPath = path; renderArtifact();
      write(content);
    },
    find(args){
      const pat = (args[0]||"").toLowerCase();
      if(!pat){ write("usage: find <pattern>"); return; }
      const res = Array.from(FS.keys()).filter(p => p.toLowerCase().includes(pat));
      write(res.length? res.join("\n") : "no results");
    },
    grep(args){
      const pat = args[0];
      const file = args[1];
      if(!pat || !file){ write("usage: grep <pattern> <file>"); return; }
      const path = norm(file);
      if(!isFile(path)){ write("no such file"); return; }
      const lines = FS.get(path).split(/\r?\n/);
      const out = [];
      lines.forEach((line,i)=>{ if(line.includes(pat)) out.push(`${i+1}:${line}`); });
      write(out.length? out.join("\n") : "no matches");
    },
    inspect(args){
      const file = args[0];
      if(!file){ write("usage: inspect <file>"); return; }
      const path = norm(file);
      if(!isFile(path)){ write("no such file"); return; }
      const content = FS.get(path);
      let note = "text";
      const isBase64 = /^[A-Za-z0-9+/=\s]+$/.test(content.trim()) && (content.trim().length % 4 === 0);
      const looksRot13 = content.includes("RYVS{") || content.includes("ryvs{");
      if(isBase64) note = "possibly base64";
      else if(looksRot13) note = "possibly rot13";
      write(`${path} — ${note}`);
      state.artifactPath = path; renderArtifact();
    },
    decode(args){
      if(!args.length){ write("usage: decode <file|text>"); return; }
      let arg = args.join(" ");
      let text = null;
      const path = norm(arg);
      if(isFile(path)){ text = FS.get(path).trim(); state.artifactPath = path; renderArtifact(); }
      else { text = arg.trim(); }
      const b64re=/^[A-Za-z0-9+/=\s]+$/;
      if(b64re.test(text) && (text.replace(/\s+/g,"").length % 4 === 0)){
        try{ write(atob(text.replace(/\s+/g,""))); return; }catch{}
      }
      const rot = (s)=> s.replace(/[a-zA-Z]/g, c => String.fromCharCode((c<='Z'?90:122) >= (c=c.charCodeAt(0)+13)? c : c-26));
      const r = rot(text);
      if(r !== text){ write(r); return; }
      const hexre=/^[0-9a-fA-F\s]+$/;
      if(hexre.test(text)){
        const clean=text.replace(/\s+/g,"");
        if(clean.length%2===0){
          try{
            let out=""; for(let i=0;i<clean.length;i+=2){ out+=String.fromCharCode(parseInt(clean.slice(i,i+2),16)); }
            write(out); return;
          }catch{}
        }
      }
      write("Could not decode.");
    },
    scan(){
      state.phase = Math.max(state.phase, 2);
      save("elif_state_v1", state);
      renderObjectives(); renderSystem();
      write(`Scan report for ${NET.host}`);
      write(`PORT   STATE SERVICE`);
      write(`80/tcp open  http`);
      write(`Tip: try curl /robots.txt`);
    },
    curl(args){
      const path = (args[0]||"").trim();
      if(!path){ write("usage: curl </path>"); return; }
      if(path === "/robots.txt"){ write(DATA.files["/home/elif/web/robots.txt"]); state.phase = Math.max(state.phase, 2); }
      else if(path === "/"){ write("index page (minimal)"); }
      else if(path === "/banner"){ write(NET.banner); }
      else { write("404 not found"); }
      save("elif_state_v1", state); renderObjectives();
    },
    "ritual.stabilize"(){
      if(state.phase < 2){ write("stabilize: preconditions not met (do basic recon first)."); return; }
      if(!state.finalMounted){
        FS.set(FINALFILE.path, atob(FINALFILE.content_b64));
        state.finalMounted = true;
      }
      state.phase = Math.max(state.phase, 3);
      save("elif_state_v1", state);
      renderObjectives(); renderSystem();
      write("[stabilize] running diagnostics … ok");
      write("[stabilize] fallback online");
      write("A new file appeared: /home/elif/final.link");
    },
    submit(args){
      const token = args[0];
      if(!token || !/^ELIF\{.+\}$/.test(token)){ write("usage: submit ELIF{...}"); return; }
      const valid = [].concat(...Object.values(PHASE_FLAGS));
      if(!valid.includes(token)){ write("invalid flag"); return; }
      if(!state.flags.includes(token)){
        state.flags.push(token);
        if(PHASE_FLAGS["1"].includes(token)) state.phase = Math.max(state.phase, 2);
        if(PHASE_FLAGS["2"].includes(token)) state.phase = Math.max(state.phase, 3);
        save("elif_state_v1", state);
        renderObjectives(); renderSystem();
        write(`flag accepted: ${token}`);
      } else {
        write("flag already submitted");
      }
      if(PHASE_FLAGS["3"].some(f => state.flags.includes(f))){
        state.won = true; save("elif_state_v1", state); renderSystem();
        write("Final links available in System panel.");
      } else if(token === "ELIF{hello_world}"){
        write("Recon unlocked. Try `scan` then `curl /robots.txt`.");
      } else if(token === "ELIF{robots_whisper}"){
        write("Fallback ready. Try `ritual.stabilize`.");
      }
    }
  };

  const input = $("#cmd");
  const history = []; let hidx = 0;
  function run(cmdline){
    const p = prompt();
    write(`${p} ${cmdline}`);
    if(!cmdline.trim()){ return; }
    const parts = cmdline.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    const fn = COMMANDS[cmd];
    if(fn){ try{ fn(args); }catch(e){ write("error: " + e.message); } }
    else { write(`command not found: ${cmd}`); }
  }
  input.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){
      const val = input.value; if(!val) return;
      history.push(val); hidx = history.length;
      run(val); input.value="";
    } else if(e.key === "ArrowUp"){
      if(hidx>0){ hidx--; input.value = history[hidx]||""; setTimeout(()=>input.setSelectionRange(input.value.length, input.value.length)); }
      e.preventDefault();
    } else if(e.key === "ArrowDown"){
      if(hidx < history.length){ hidx++; input.value = history[hidx]||""; setTimeout(()=>input.setSelectionRange(input.value.length, input.value.length)); }
      e.preventDefault();
    }
  });

  const themeBtn = $("#themeBtn");
  const saved = localStorage.getItem('theme');
  if(saved === 'light'){ document.documentElement.setAttribute('data-theme','light'); }
  themeBtn?.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme');
    if(cur==='light'){ document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','dark'); }
    else { document.documentElement.setAttribute('data-theme','light'); localStorage.setItem('theme','light'); }
  });
  window.addEventListener("keydown", (e)=>{
    // Ignore hotkey while typing in inputs/textareas/contenteditable
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
    const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable);
    if(isTyping) return;
    if(e.key.toLowerCase()==="t" && (e.ctrlKey||e.metaKey||e.altKey||!e.shiftKey)){ themeBtn?.click(); }
  });

  function boot(){
    write("Welcome to pseudo-kali. Type `help` to begin.");
    const cwd = state.cwd || "/home/elif"; state.cwd = cwd;
    $("#prompt").textContent = `elif@localhost:${cwd}$`;
    renderObjectives(); renderArtifact(); renderSystem();
  }
  boot();
})();
