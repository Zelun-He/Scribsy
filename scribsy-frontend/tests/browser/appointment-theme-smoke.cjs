// Isolated fictional appointments; this test never writes production patient data.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const root = process.env.WORKFLOW_BASE_URL || 'http://127.0.0.1:3100';
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'], headless: true, ...(process.env.BROWSER_PROXY ? { proxy: { server: process.env.BROWSER_PROXY } } : {}) });
 try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, ignoreHTTPSErrors: true });
  let patientCreations=0, appointments=[], failNext=false, release;
  const patient={id:21,first_name:'Jamie',last_name:'Example',date_of_birth:'1990-01-01'};
  await context.route('**/api/**', async route => {
   const request=route.request(),path=new URL(request.url()).pathname;
   let body={},status=200;
   if(path.endsWith('/auth/me')) body={id:101,username:'theme_qa',email:'qa@example.com',is_demo:false,is_active:true,role:'provider'};
   else if(path.endsWith('/appointments') && request.method()==='POST') {
    const payload=request.postDataJSON();appointments.push(payload);
    if(failNext){failNext=false;status=500;body={detail:'Fictional scheduling failure. Please retry.'};}
    else { await new Promise(resolve=>{release=resolve});body={id:51,status:'scheduled',...payload}; }
   }
   else if(/\/patients\/?$/.test(path) && request.method()==='POST') {patientCreations++;body={...patient,...request.postDataJSON(),id:22};}
   else if(path.includes('/patients')) body=[patient];
   else if(path.includes('/dashboard')) body={patients:[patient],notes:[],appointments:[]};
   else body=[];
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(root+'/appointments/new');
  await page.getByRole('heading',{name:'Schedule an appointment',exact:true}).waitFor();
  const submit=page.getByRole('button',{name:'Create appointment',exact:true});
  assert.equal(await submit.getAttribute('aria-busy'),'false');
  const inspectColors=()=>page.evaluate(()=>{
   const green=color=>{
    const nums=color.match(/[\d.]+/g);if(!nums||nums.length<3)return false;
    const [r,g,b,a=1]=nums.map(Number);if(a<.05)return false;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;if(!delta||delta/max<.05)return false;
    let h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;h=(h*60+360)%360;
    return h>=80&&h<=175;
   };
   return [...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().width && el.getBoundingClientRect().height).flatMap(el=>{
    const s=getComputedStyle(el);return ['color','backgroundColor','borderTopColor','outlineColor'].filter(p=>green(s[p])).map(p=>el.tagName+':'+p+':'+s[p]);
   }).slice(0,15);
  });
  for(const theme of ['light','dark']){
   await page.getByRole('button',{name:theme==='dark'?'Dark mode':'Light mode',exact:true}).last().click();
   await page.waitForTimeout(100);
   assert.deepEqual(await inspectColors(),[],`${theme} form contains no green UI colors`);
   await page.getByRole('button',{name:'+ Add new patient',exact:true}).click();
   assert.deepEqual(await inspectColors(),[],`${theme} new-patient form contains no green UI colors`);
   await page.getByRole('button',{name:'Use an existing patient',exact:true}).click();
   for(const width of [320,375,768,1440]){
    await page.setViewportSize({width,height:1100});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${theme} fits ${width}`);
    const bounds=await submit.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
    if(process.env.WORKFLOW_SCREENSHOT_DIR && (width===375||width===1440)){
     await page.locator('.workspace-main').evaluate(el=>{el.scrollTop=0;});
     await page.screenshot({path:`${process.env.WORKFLOW_SCREENSHOT_DIR}/appointment-${theme}-${width}.png`});
    }
   }
  }
  await page.setViewportSize({width:1440,height:1100});
  await page.getByRole('button',{name:'Light mode',exact:true}).last().click();
  await page.getByLabel('Patient *',{exact:true}).selectOption('21');
  await page.getByLabel('Date *',{exact:true}).fill('2099-12-31');
  await page.getByLabel('Time *',{exact:true}).fill('14:30');
  await page.getByLabel('Title Optional',{exact:true}).fill('Fictional follow-up');
  await page.getByLabel('Notes Optional',{exact:true}).fill('Fictional appointment notes.');
  await page.getByLabel('Reminder',{exact:true}).selectOption('60');
  await submit.focus();assert.equal(await submit.getAttribute('aria-busy'),'false');
  await submit.press('Space');
  const creating=page.getByRole('button',{name:'Creating appointment…',exact:true});
  await creating.waitFor();assert.equal(await creating.isDisabled(),true);assert.equal(await creating.getAttribute('aria-busy'),'true');
  for(let n=0;!release&&n<100;n++)await page.waitForTimeout(50);assert.ok(release);release();
  await page.waitForURL('**/dashboard');
  assert.equal(appointments.length,1);assert.equal(appointments[0].patient_id,21);assert.equal(appointments[0].notify_before_minutes,60);
  assert.equal(appointments[0].title,'Fictional follow-up');assert.ok(appointments[0].scheduled_at.endsWith('Z'));
  // A successfully created patient is retained when appointment creation fails.
  await page.goto(root+'/appointments/new');
  await page.getByRole('button',{name:'+ Add new patient',exact:true}).click();
  await page.getByLabel('First name *',{exact:true}).fill('Fictional');await page.getByLabel('Last name *',{exact:true}).fill('Example');await page.getByLabel('Date of birth *',{exact:true}).fill('1995-01-01');
  await page.getByLabel('Date *',{exact:true}).fill('2099-12-31');await page.getByLabel('Time *',{exact:true}).fill('15:00');
  failNext=true;await submit.click();await page.getByRole('alert').filter({hasText:'Fictional scheduling failure'}).waitFor();
  assert.equal(patientCreations,1);assert.equal(await page.getByLabel('Patient *',{exact:true}).inputValue(),'22');
  release=null;await submit.click();await creating.waitFor();for(let n=0;!release&&n<100;n++)await page.waitForTimeout(50);assert.ok(release);release();await page.waitForURL('**/dashboard');assert.equal(patientCreations,1);
  await page.goto(root+'/appointments/new');await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await submit.locator('[class*=letter]').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForURL('**/dashboard');
  assert.deepEqual(errors,[]);await context.close();console.log('PASS: neutral light/dark UI, inline patient form, four responsive widths, animated submit, real request loading, appointment payload, retained patient on retry, reduced motion, cancel.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
