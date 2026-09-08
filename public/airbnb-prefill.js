// Airbnb URL prefill - injected when ?airbnb=1 params are present
// URL: ?airbnb=1&guest=Name&ci=YYYY-MM-DD&co=YYYY-MM-DD&nights=N&amount=XX.XX&ref=CODE
(async function checkAirbnbPrefill(){
  var p=new URLSearchParams(window.location.search);
  if(!p.get('airbnb'))return;
  var guestName=(p.get('guest')||'').trim();
  var ci=p.get('ci')||'';
  var co=p.get('co')||'';
  var amount=parseFloat(p.get('amount')||0);
  var nights=parseInt(p.get('nights')||1);
  var ref=p.get('ref')||'';
  var banner=document.createElement('div');
  banner.id='airbnb-banner';
  banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#f59e0b;color:#1c1917;padding:10px 20px;font-size:13px;font-weight:600;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.2);';
  banner.innerHTML='New Airbnb booking: <strong>'+guestName+'<\/strong> &nbsp;&middot;&nbsp; '+ci+' &rarr; '+co+' &nbsp;&middot;&nbsp; Review and click <strong>Save Reservation<\/strong>. <button onclick="document.getElementById(\'airbnb-banner\').remove()" style="margin-left:12px;background:rgba(0,0,0,.15);border:none;color:#1c1917;padding:2px 10px;border-radius:4px;cursor:pointer;font-weight:600;">x<\/button>';
  document.body.prepend(banner);
  await new Promise(function(r){setTimeout(r,1200);});
  var tok=localStorage.getItem('pms_auth_token')||'';
  var hdrs={'x-auth-token':tok,'Content-Type':'application/json'};
  var guestId=null;
  try{
    var gRes=await fetch('/api/guests',{headers:hdrs});
    if(gRes.ok){
      var gList=await gRes.json();
      var found=gList.find(function(g){return((g.first_name||'')+' '+(g.last_name||'')).trim().toLowerCase()===guestName.toLowerCase();});
      if(found){guestId=found.id;}
      else{
        var parts=guestName.split(' ');var last_name=parts.pop()||'';var first_name=parts.join(' ');
        var cRes=await fetch('/api/guests',{method:'POST',headers:hdrs,body:JSON.stringify({first_name:first_name,last_name:last_name,email:'',phone:'',lang:'en',notes:'Airbnb guest'+(ref?' - Ref '+ref:'')})});
        if(cRes.ok){var ng=await cRes.json();guestId=ng.id;}
      }
    }
  }catch(e){console.log('Airbnb prefill guest error:',e);}
  openNewReservationModal();
  await new Promise(function(r){setTimeout(r,500);});
  if(ci) document.getElementById('mres-ci').value=ci;
  if(co) document.getElementById('mres-co').value=co;
  if(guestId){fillGuestSelect('mres-guest');await new Promise(function(r){setTimeout(r,300);});document.getElementById('mres-guest').value=guestId;}
  document.getElementById('mres-source').value='airbnb';
  document.getElementById('mres-status').value='confirmed';
  if(nights>0&&amount>0) document.getElementById('mres-rate').value=(amount/nights).toFixed(2);
  document.getElementById('mres-adults').value=1;
  document.getElementById('mres-notes').value='Airbnb booking'+(ref?' - Ref '+ref:'')+(amount?' - Host payout: '+amount:'');
  if(typeof calcNights==='function') calcNights();
  window.history.replaceState({},'',window.location.pathname);
})();
