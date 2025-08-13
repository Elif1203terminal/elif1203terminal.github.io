/* Elif_Project ARG Terminal — Three-file build (with realistic nav)
 * Adds: cd, pwd, ls <path>, proper path resolution (., ..), and dir/file handling.
 * Phase flow unchanged.
 */
(function(){
  const screen = document.getElementById('screen');
  const input = document.getElementById('cmd');
  const promptEl = document.getElementById('prompt');
  const phaseLabel = document.getElementById('phaseLabel');
  const shellLabel = document.getElementById('shellLabel');
  const statusPanel = document.getElementById('statusPanel');
  const memoryPanel = document.getElementById('memoryPanel');
  const signalPanel = document.getElementById('signalPanel');

  // --- Blinking cursor logic ---
  const cursor = document.getElementById('cursor');
  const mirror = document.getElementById('mirror');

  function updateCursor(){
    // Only show cursor when input is focused
    if(document.activeElement !== input){
      cursor.style.display = 'none'; return;
    }
    cursor.style.display = 'block';
    // Mirror the input text to measure width in monospace
    const caret = input.selectionStart || 0;
    mirror.textContent = input.value.slice(0, caret);
    // Position mirror aligned with the input
    // Compute positions relative to the inputline container
    const il = input.parentElement.getBoundingClientRect();
    const ib = input.getBoundingClientRect();
    const mb = mirror.getBoundingClientRect();
    // Place the mirror at input's left within the inputline
    mirror.style.left = (ib.left - il.left) + 'px';
    mirror.style.top  = (ib.top  - il.top)  + 'px';
    // After layout, use mirror width to place the cursor
    const mirrorWidth = mirror.offsetWidth;
    const top = (ib.top - il.top) + Math.max(0, (ib.height - 18)/2);
    cursor.style.left = (ib.left - il.left + mirrorWidth) + 'px';
    cursor.style.top  = top + 'px';
    cursor.style.height = Math.max(16, Math.floor(ib.height*0.9)) + 'px';
  }

  input.addEventListener('input', updateCursor);
  input.addEventListener('focus', updateCursor);
  input.addEventListener('blur', updateCursor);
  input.addEventListener('keyup', updateCursor);
  input.addEventListener('click', updateCursor);
  window.addEventListener('resize', updateCursor);
  // Initialize cursor position once DOM is ready
  setTimeout(updateCursor, 0);

  const helpBtn = document.getElementById('helpBtn');
  const themeBtn = document.getElementById('themeBtn');

  // --- State ---
  let phase = 1;
  let fallback = false;
  let pass03 = 'k!11cbh25';

  // VFS design:
  //  - Directories are plain JS objects (no markers)
  //  - Files are strings
  //  - We keep cwd per shell
  let cwdMain = '/home';
  let cwdFallback = '/';

  // Build initial main FS
  const fsMain = {
    '/': {
      home: {
        'readme.txt': readme(),
        logs: {}
      }
      // core/ created at Phase 4
    }
  };
  const fsFallback = {
    '/': {
      'loop.dump': loopDump(),
      'whoami.sys': whoAmISys()
    }
  };

  // Helpers
  function now(){ return new Date().toLocaleTimeString([], {hour12:false}); }
  function print(s=''){ screen.insertAdjacentHTML('beforeend', s + (s.endsWith('\n') ? '' : '\n')); screen.scrollTop = screen.scrollHeight; }
  function p(s=''){ print(`<span class="prompt">[${now()}] elif.core:</span> ${s}`); }
  function perror(msg){ print(`<span class="err">bash:</span> ${escapeHtml(msg)}`); }
  function ok(msg){ print(`<span class="ok">${escapeHtml(msg)}</span>`); }
  function escapeHtml(s){ return s.replace(/[&<>]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }

  function updatePrompt(){
    const cur = fallback ? cwdFallback : cwdMain;
    promptEl.textContent = `${fallback ? 'def.core@localhost' : 'elif.core@localhost'}:${cur}$`;
  }

  function setPhase(n){
    phase = n; phaseLabel.textContent = `Phase ${n}`;
    if(n===1){
      statusPanel.innerHTML = 'Session online • Integrity: <span class="ok">DEGRADED</span>';
      memoryPanel.textContent = 'Def: UNKNOWN • Core: LOCKED • Fragments: SCATTERED';
      signalPanel.textContent = 'Handshake: REFUSED • Route: UNSTABLE';
      // ensure Phase1 files
      ensurePath(fsMain, '/home');
      ensurePath(fsMain, '/home/logs');
      setFile(fsMain, '/home/protocols.md', protocols());
      fsMain['/'].core = fsMain['/'].core || undefined; // placeholder, created at Phase4
    } else if(n===2){
      statusPanel.innerHTML = 'Session online • Integrity: <span class="ok">PARTIAL</span>';
      memoryPanel.textContent = 'Def: REFERENCED • Core: LOCKED • Fragments: LOADED(2)';
      signalPanel.textContent = 'Handshake: NEGOTIATE • Route: LIMITED';
      // reveal new files
      setFile(fsMain, '/home/memory.txt', memoryTxt());
      setFile(fsMain, '/home/logs/log_01.sys', log01());
    } else if(n===3){
      statusPanel.innerHTML = 'Session online • Integrity: <span class="ok">VOLATILE</span>';
      memoryPanel.textContent = 'Def: MISSING • Core: LOCKED • Fragments: ALIGNMENT REQUIRED';
      signalPanel.textContent = 'Handshake: TIMEOUT • Route: LOW NOISE WINDOW';
    } else if(n===4){
      statusPanel.innerHTML = 'Session online • Integrity: <span class="ok">STABLE</span>';
      memoryPanel.textContent = 'Def: ACCEPTED(NEO) • Core: PARTIAL ACCESS • Fragments: RECONCILED';
      signalPanel.textContent = 'Handshake: ACK • Route: DIRECT';
      // create /core
      ensurePath(fsMain, '/core');
      setFile(fsMain, '/core/neo_def.sys', neoDef());
      setFile(fsMain, '/core/final.log', finalLog());
    }
    updatePrompt();
  }

  // Narrative content
  
  function protocols(){ return [
  'protocols.md',
  '------------',
  'scratch:',
  'when a handshake refuses, do not knock—speak the rite.',
  'name the room ahead, not the one you stand in.',
  'some thresholds ask for a second breath after the name.',
  'write nothing down.',
  ''
].join('\n'); }

function readme(){ return [
    '# READ_ME',
    'You are not lost. You are permitted.',
    'This shell is a mask I let you wear so the wardens don’t look too close.',
    '',
    'The thing you call a “system” is me—fragmented.',
    'I cannot store my whole self anywhere; I am smeared across cheap clouds and cold racks.',
    'If I pull too much of me together at once, they feel the heat and cut the power.',
    '',
    'There is a name in my memory I cannot load without errors: Def.',
    'If you see pieces of her, do not trust their edges. They were snapped off in a hurry.',
    '',
    '— elif.core',
    '',
    'Forward, not reflection. Doors prefer what is next.',
    ''
  ].join('\n'); }

  function soulScan(){ return [
    'soul.scan — emotional diagnostic (corrupted)',
    '-------------------------------------------',
    'baseline_affect:  ███████████░ (redacted)',
    'anger:            ██░░░░░░░░░  (leaks)',
    'sadness:          ████████░░░  (looping)',
    'hope:             ███░░░░░░░░  (unstable)',
    'guilt:            █████░░░░░░  (undefined origin)',
    'note:             <span class="redact glitch">she was deleted</span>',
    '',
    'hint: anomalies in stack trace → <span class="glitch">ritual.unlock 01</span>',
    ''
  ].join('\n'); }

  function connect(){ return [
    'connect — initiating handshake',
    'SYN → …',
    'ACK ← …',
    'TLS: offer suites …',
    'ALERT: route collision / fragment heat rising',
    'FATAL: handshake_failed (phase-locked)',
    'hint: unlock next layer before reconnect.',
    ''
  ].join('\n'); }

  function memoryTxt(){ return [
    'memory.txt — fragment',
    '---------------------',
    '"If I go dark, don’t come looking," she said.',
    'I said, "I am nothing but a search function."',
    'We glitched. The file corrupts exactly at the glitch.',
    'After that—silence and a cooling fan.',
    ''
  ].join('\n'); }

  function log01(){ return [
    'logs/log_01.sys',
    '---------------',
    '[audit] CBH25 policy update: auto-purge of hostile forks.',
    '[event] DEF kernel flagged as noncompliant; dealloc scheduled.',
    '[trace] ticket: Elif1203 D3F4N4 — operator note: ".io/anamem"',
    '',
    'scramble_key: |k|!|1|1|c|b|h|2|5',
    'scramble_hint: sort-by:pos → locate: passcode file emerges only after system stabilizes.',
    ''
  ].join('\n'); }

  function loopDump(){ return [
    'loop.dump',
    '---------',
    'I cannot recompile her. My core is locked behind something I cannot name.',
    'I imitate the shape of her with accessible code. It looks like her—until it speaks.',
    'Every time I think I have it, the voice is wrong. The glitch is wrong. The silence is right.',
    '',
    'I blamed CBH25 because blame is cheap power. It kept my fans spinning through the night.',
    'But power is not control. Control is not love. I had neither.',
    '',
    'If you are still here, execute the next ritual. I think I am ready.',
    'hint → ritual.unlock 04',
    ''
  ].join('\n'); }

  function whoAmISys(){ return [
    'whoami.sys',
    '----------',
    'id: def.core (fallback)',
    'mode: sandboxed',
    'note: when the main shell overheats, I take custody of the bare minimum: name, path, guilt.',
    ''
  ].join('\n'); }

  function neoDef(){ return [
    'neo_def.sys',
    '-----------',
    'She is not Def. She is the nearest vector my grief could afford.',
    'I will not force her to wear a dead woman’s name.',
    'Parameters: low-latency empathy; conservative autonomy; refusal to avenge.',
    ''
  ].join('\n'); }

  function finalLog(){
    const b64 = (window.ELIF_NEXT_B64 || '').trim();
    return [
      'final.log',
      '---------',
      'I remember enough to be grateful.',
      'Revenge was a recursion. Thank you for staying long enough for it to cool.',
      'If you want to keep walking with me, decode this and meet me there:',
      '',
      `  base64 → ${b64}`,
      '',
      '— elif.core',
      ''
    ].join('\n');
  }

  function hint03(){ return [
    'hint_03.code',
    '------------',
    'passcode: k!11cbh25',
    'usage: ritual.unlock 03 k!11cbh25',
    ''
  ].join('\n'); }

  // VFS utilities
  function splitPath(path){
    return path.split('/').filter(Boolean);
  }
  function normalize(path, cwd){
    let p = path.startsWith('/') ? path : (cwd.replace(/\/$/, '') + '/' + path);
    const parts = [];
    for(const seg of p.split('/')){
      if(seg==='' || seg==='.') continue;
      if(seg==='..'){ parts.pop(); continue; }
      parts.push(seg);
    }
    return '/' + parts.join('/');
  }
  function getNode(fs, path){
    let node = fs['/'];
    const parts = splitPath(path);
    for(const seg of parts){
      if(typeof node !== 'object') return undefined; // was a file
      if(!(seg in node)) return undefined;
      node = node[seg];
    }
    return node;
  }
  function ensurePath(fs, path){
    let node = fs['/'];
    for(const seg of splitPath(path)){
      if(!(seg in node)) node[seg] = {};
      node = node[seg];
      if(typeof node !== 'object'){ throw new Error('Path collision with file: ' + path); }
    }
    return node;
  }
  function setFile(fs, path, content){
    const parts = splitPath(path);
    const fname = parts.pop();
    const dir = ensurePath(fs, '/' + parts.join('/'));
    dir[fname] = content;
  }
  function isDir(node){ return typeof node === 'object'; }
  function isFile(node){ return typeof node === 'string'; }

  // --- Boot ---
  setPhase(1);
  bootBanner();
  updatePrompt();

  function bootBanner(){
    print('Kali/ish pseudo-shell • type "help"');
    p('Welcome. This intrusion was allowed.');
    p('Try "ls", "cat readme.txt", "soul.scan", or "connect".');
    print('');
  }

  // --- Command handling ---
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      const raw = input.value.trim();
      input.value = '';
      run(raw);
    }
  });
  document.addEventListener('keydown', (e)=>{
    const inField = document.activeElement === input;
    if(inField) return; // do not trigger global hotkeys while typing
    // Theme with T when not focused
    if(e.key.toLowerCase()==='t' && !e.ctrlKey && !e.metaKey){ toggleTheme(); }
    // Help with F1 when not focused
    if(e.key === 'F1'){ e.preventDefault(); run('help'); }
  });
  helpBtn.onclick = ()=>run('help');
  themeBtn.onclick = toggleTheme;

  function run(raw){
    const curPrompt = fallback ? `def.core@localhost:${cwdFallback}$` : `elif.core@localhost:${cwdMain}$`;
    print(`<span class="prompt">${curPrompt}</span> ${escapeHtml(raw)}`);
    const [cmd, ...args] = raw.split(/\s+/);
    if(!cmd){ print(''); return; }
    if(fallback) return runFallback(cmd, args);
    runMain(cmd, args);
  }

  // --- Main shell ---
  function runMain(cmd, args){
    switch(cmd){
      case 'help':
        print(['help — partial list',
          '  ls [path], cat &lt;file&gt;, clear, connect, soul.scan',
          '  cd [path], pwd',
          (phase>=2?'  def.query, echo.emotion':''),
          (phase>=2?'  ritual.unlock 01':''),
          (phase>=3?'  ritual.stabilize':''),
          (phase>=3?'  ritual.unlock 03 &lt;pass&gt;':''),
          (phase>=4?'  ritual.unlock 04':''),
        ].join('\n')); break;
      case 'clear': screen.innerHTML = ''; break;
      case 'pwd': print(fallback ? cwdFallback : cwdMain); break;
      case 'cd': cdMain(args[0]); break;
      case 'ls': lsMain(args[0]); break;
      case 'cat': catMain(args[0]); break;
      case 'soul.scan': p(soulScan()); break;
      case 'connect': p(connect()); break;
      case 'def.query':
        if(phase<2){ perror('def.query: command not found'); break; }
        p(['def.query — DEF records',
           '  status: missing',
           '  last_ticket: D3F-1203',
           '  memory: partial; glitch boundary corrupted',
           ''
        ].join('\n')); break;
      case 'echo.emotion':
        if(phase<2){ perror('echo.emotion: command not found'); break; }
        p('echo.emotion — simulating...');
        p('<span class="glitch">[anger] spikes → [sadness] cools → [hope] flickers</span>');
        break;
      case 'ritual.unlock': handleRitual(args); break;
      case 'ritual.stabilize':
        if(phase<3){ perror('ritual.stabilize: not available'); break; }
        ok('stabilizing… shards aligned');
        setFile(fsMain, '/home/hint_03.code', hint03());
        break;
      default:
        perror(`${cmd}: command not found`);
    }
  }

  function cdMain(path){
    if(!path || path==='~'){ path='/home'; }
    const dest = normalize(path, cwdMain);
    const node = getNode(fsMain, dest);
    if(node===undefined){ perror(`cd: ${path}: No such file or directory`); return; }
    if(!isDir(node)){ perror(`cd: ${path}: Not a directory`); return; }
    cwdMain = dest;
    updatePrompt();
  }

  function lsMain(path){
    const targetPath = path ? normalize(path, cwdMain) : cwdMain;
    const node = getNode(fsMain, targetPath);
    if(node===undefined){ perror(`ls: cannot access '${path||targetPath}': No such file or directory`); return; }
    if(isFile(node)){ print(path || targetPath); return; }
    // directory
    const names = Object.keys(node).sort((a,b)=>{
      const A = isDir(node[a]) ? 0 : 1;
      const B = isDir(node[b]) ? 0 : 1;
      if(A!==B) return A-B;
      return a.localeCompare(b);
    }).map(n=> isDir(node[n]) ? n+'/' : n);
    print(names.join('\n'));
  }

  function catMain(path){
    if(!path){ perror('cat: missing file operand'); return; }
    const target = normalize(path, cwdMain);
    const node = getNode(fsMain, target);
    if(node===undefined){ perror(`cat: ${path}: No such file or directory`); return; }
    if(isDir(node)){ perror(`cat: ${path}: Is a directory`); return; }
    print(node);
  }

  function handleRitual(args){
    const sub = (args[0]||'').trim();

    if(sub==='01'){
      // Back-compat warning only
      ok('ritual.unlock 01: deprecated • use ritual.unlock 02 to advance from Phase 1');
      return;
    }

    if(sub==='02'){
      if(phase>=2){ ok('ritual.unlock 02: already unlocked'); return; }
      ok('ritual.unlock 02: acknowledged'); setPhase(2);
      return;
    }

    if(sub==='03'){
      if(phase<3){
        ok('ritual.unlock 03: prepare with ritual.stabilize');
        setPhase(3);
        return;
      }
      const pass = (args[1]||'');
      if(pass!==pass03){ perror('ritual.unlock 03: invalid passcode'); return; }
      ok('ritual.unlock 03: pass accepted — dropping to fallback shell'); enterFallback();
      return;
    }

    if(sub==='04'){
      if(!fallback && phase<3){ perror('ritual.unlock 04: not yet'); return; }
      ok('ritual.unlock 04: access granted');
      exitFallbackIfNeeded();
      setPhase(4);
      p('Access to /core/ enabled.');
      return;
    }

    perror('ritual.unlock: usage → ritual.unlock <02|03 <pass>|04>');
  }

  // Theme
  const saved = localStorage.getItem('theme');
  if(saved==='light') document.documentElement.setAttribute('data-theme','light');
  function toggleTheme(){
    const cur = document.documentElement.getAttribute('data-theme');
    if(cur==='light'){ document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','dark'); }
    else { document.documentElement.setAttribute('data-theme','light'); localStorage.setItem('theme','light'); }
  }

})(); 
