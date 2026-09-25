export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response(`<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Local SEO Opportunity Finder</title>
<style>
body{font-family:Arial;margin:0;background:#f5f7fb;color:#172033}
.box{max-width:600px;margin:30px auto;padding:20px}
.card{background:#fff;padding:20px;border-radius:16px;box-shadow:0 4px 20px #0001}
input,select,button{width:100%;padding:14px;margin:8px 0 14px;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;font-size:16px}
button{background:#111827;color:#fff;border:0;font-weight:bold}
.item{background:#f1f5f9;padding:12px;border-radius:10px;margin:8px 0}
.small{color:#64748b;font-size:14px}
</style>
</head>
<body>
<div class="box"><div class="card">
<h1>Local SEO Opportunity Finder</h1>
<p class="small">Find basic SEO opportunities on a local business website.</p>
<input id="site" placeholder="https://example.com">
<input id="city" placeholder="City">
<select id="type"><option>Dentist</option><option>HVAC</option><option>Plumber</option><option>Roofer</option></select>
<button onclick="analyze()">Analyze Website</button>
<div id="result"></div>
</div></div>
<script>
async function analyze(){
 const site=document.getElementById("site").value.trim();
 const city=document.getElementById("city").value.trim();
 const type=document.getElementById("type").value;
 const r=document.getElementById("result");
 if(!site){r.innerHTML="<p>Enter a website URL.</p>";return}
 r.innerHTML="<p>Analyzing...</p>";
 try{
  const x=await fetch("/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:site,city,type})});
  const d=await x.json();
  if(!d.success){r.innerHTML="<p>Error: "+d.error+"</p>";return}
  let h="<h2>SEO Report</h2>";
  h+="<div class='item'><b>Title:</b><br>"+(d.title||"Not detected")+"</div>";
  h+="<div class='item'><b>Meta Description:</b><br>"+(d.description||"Not detected")+"</div>";
  h+="<div class='item'><b>H1:</b><br>"+(d.h1.length?d.h1.join("<br>"):"Not detected")+"</div>";
  h+="<h3>Top Opportunities</h3>";
  d.opportunities.forEach(o=>{h+="<div class='item'><b>"+o.title+"</b><br><span class='small'>"+o.reason+"</span></div>"});
  r.innerHTML=h;
 }catch(e){r.innerHTML="<p>Connection error: "+e.message+"</p>"}
}
</script>
</body></html>`,{headers:{"Content-Type":"text/html;charset=UTF-8"}});
    }

    if (request.method === "POST" && url.pathname === "/analyze") {
      try {
        const body = await request.json();
        let target = String(body.url || "").trim();
        if (!target) throw new Error("Website URL is required.");
        if (!/^https?:\/\//i.test(target)) target = "https://" + target;

        const response = await fetch(target,{headers:{"User-Agent":"Mozilla/5.0 LocalSEOOpportunityFinder"},redirect:"follow"});
        if (!response.ok) throw new Error("Website returned HTTP " + response.status);

        const html = await response.text();
        const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = tm ? tm[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim() : "";

        const dm = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                   html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
        const description = dm ? dm[1].trim() : "";

        const h1=[];
        for(const m of html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)){
          const v=m[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
          if(v) h1.push(v);
          if(h1.length>=10) break;
        }

        const text=(title+" "+description+" "+h1.join(" ")+" "+html.replace(/<[^>]+>/g," ")).toLowerCase();
        const checks=[
          ["Emergency Dentist",["emergency dentist","emergency dental"]],
          ["Dental Implants",["dental implant"]],
          ["Root Canal",["root canal"]],
          ["Braces / Orthodontics",["braces","orthodont"]],
          ["Teeth Whitening",["teeth whitening","whitening"]],
          ["FAQ Content",["faq","frequently asked"]]
        ];

        const opportunities=[];
        if(!title) opportunities.push({title:"Add a clear page title",reason:"No page title was detected."});
        if(!description) opportunities.push({title:"Add a meta description",reason:"No meta description was detected."});
        if(!h1.length) opportunities.push({title:"Add one clear H1",reason:"No H1 heading was detected."});

        for(const c of checks){
          if(!c[1].some(w=>text.includes(w)))
            opportunities.push({title:"Review "+c[0],reason:"This signal was not detected on the public page."});
        }

        return new Response(JSON.stringify({success:true,url:response.url||target,title,description,h1,opportunities:opportunities.slice(0,5)}),{headers:{"Content-Type":"application/json"}});
      } catch(e) {
        return new Response(JSON.stringify({success:false,error:e.message||"Unknown error"}),{status:400,headers:{"Content-Type":"application/json"}});
      }
    }

    return new Response("Not Found",{status:404});
  }
};