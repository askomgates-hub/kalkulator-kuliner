import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';

'use strict';
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setBackgroundColor({ color: '#17483d' });
  StatusBar.setStyle({ style: Style.Light });
}
const $=id=>document.getElementById(id),KEY='kk_v04_db',SNAP='kk_v04_snapshot';
const today=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const money=n=>'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID'),id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=()=>({stocks:[],recipes:[],productions:[],products:[],transactions:[],movements:[]});
let db=(()=>{try{return {...empty(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){return empty()}})();
const val=id=>Number($(id).value)||0;
function toast(s){let t=$('toast');t.textContent=s;t.style.display='block';clearTimeout(window.tt);window.tt=setTimeout(()=>t.style.display='none',2600)}
function snap(){return {app:'Kalkulator Kuliner',version:'0.5.1',createdAt:new Date().toISOString(),data:db}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));localStorage.setItem(SNAP,JSON.stringify(snap()));render();backupStatus()}catch(e){toast('Penyimpanan browser penuh. Segera unduh backup.')}}
function go(tab){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id===tab));document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x.dataset.tab===tab));document.querySelector(`nav [data-tab="${tab}"]`)?.scrollIntoView({inline:'center',block:'nearest'});render()}
document.querySelectorAll('[data-tab]').forEach(x=>x.onclick=()=>go(x.dataset.tab));document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
function none(t){return `<div class="empty">${t}</div>`}
function renderHome(){let inc=sum('in'),out=sum('out'),stock=db.stocks.reduce((a,s)=>a+s.qty*s.price,0);$('homeStats').innerHTML=[['Omzet tercatat',money(inc)],['Pengeluaran',money(out)],['Selisih kas',money(inc-out)],['Jenis bahan',db.stocks.length],['Resep tersimpan',db.recipes.length],['Nilai stok',money(stock)]].map(a=>`<div class="stat"><small>${a[0]}</small><b>${a[1]}</b></div>`).join('');let low=db.stocks.filter(s=>s.qty<=s.min);$('low').innerHTML=low.length?low.map(s=>`<div class="item"><b>${safe(s.name)}</b><small>${s.qty} ${s.unit} · minimum ${s.min}</small></div>`).join(''):none('Semua stok di atas batas minimum.');let a=[...db.transactions.map(t=>({date:t.date,title:t.note,sub:t.type==='in'?'Pemasukan':'Pengeluaran',amount:money(t.amount)})),...db.productions.map(p=>({date:p.date,title:p.recipeName,sub:`Produksi ${p.batch} batch · ${p.units} unit`,amount:money(p.cost)}))].sort((x,y)=>y.date.localeCompare(x.date)).slice(0,5);$('activity').innerHTML=a.length?a.map(x=>`<div class="item"><b>${safe(x.title)}</b><small>${x.date} · ${x.sub}</small>${x.amount}</div>`).join(''):none('Belum ada aktivitas.')}
function sum(type){return db.transactions.filter(t=>t.type===type).reduce((a,t)=>a+t.amount,0)}
let costs=[['Bahan baku',0],['Kemasan',0],['Tenaga kerja',0],['Biaya lain',0]];
function drawCosts(){$('costRows').innerHTML=costs.map((c,i)=>`<div class="grid cost" style="grid-template-columns:1fr 1fr auto;align-items:end"><div class="field"><label>Komponen</label><input data-cn="${i}" value="${safe(c[0])}"></div><div class="field"><label>Biaya (Rp)</label><input data-cv="${i}" type="number" min="0" value="${c[1]}"></div><button class="btn red" data-cd="${i}">Hapus</button></div>`).join('');document.querySelectorAll('[data-cn]').forEach(e=>e.oninput=()=>{costs[+e.dataset.cn][0]=e.value;calcHpp()});document.querySelectorAll('[data-cv]').forEach(e=>e.oninput=()=>{costs[+e.dataset.cv][1]=+e.value||0;calcHpp()});document.querySelectorAll('[data-cd]').forEach(e=>e.onclick=()=>{costs.splice(+e.dataset.cd,1);drawCosts();calcHpp()})}
function calcHpp(){let total=costs.reduce((a,c)=>a+c[1],0),y=val('hpYield'),m=val('hpMargin'),unit=y?total/y:0,price=m>=0&&m<100?unit/(1-m/100):0;$('hpUnit').textContent=money(unit);$('hpPrice').textContent=money(price);return {total,y,m,unit,price}}
$('addCost').onclick=()=>{costs.push(['Komponen baru',0]);drawCosts();calcHpp()};['hpYield','hpMargin'].forEach(x=>$(x).oninput=calcHpp);
$('saveProduct').onclick=()=>{let c=calcHpp(),name=$('hpName').value.trim();if(!name||c.y<1||c.total<=0||c.m<0||c.m>=100)return toast('Lengkapi nama, hasil, biaya dan margin 0–99,9%.');db.products.push({id:id(),name,yield:c.y,total:c.total,hpp:c.unit,margin:c.m,price:c.price});save();toast('Produk disimpan.');go('products')};
function move(s,d,n,date=today()){db.movements.push({name:s.name,unit:s.unit,delta:d,note:n,date})}
function renderStock(){$('adjItem').innerHTML=db.stocks.map(s=>`<option value="${s.id}">${safe(s.name)} (${s.qty} ${s.unit})</option>`).join('');$('stockList').innerHTML=db.stocks.length?db.stocks.map(s=>`<div class="item row"><div><b>${safe(s.name)}</b><small>${s.qty} ${s.unit} · batas ${s.min} · ${money(s.price)}/${s.unit}</small></div><b>${money(s.qty*s.price)}</b></div>`).join(''):none('Belum ada bahan.');$('stockHistory').innerHTML=db.movements.length?[...db.movements].reverse().slice(0,30).map(m=>`<div class="item row"><div><b>${safe(m.name)}</b><small>${m.date} · ${safe(m.note)}</small></div><b>${m.delta>0?'+':''}${m.delta} ${m.unit}</b></div>`).join(''):none('Belum ada riwayat stok.')}
$('saveStock').onclick=()=>{let name=$('stName').value.trim(),unit=$('stUnit').value,q=val('stQty'),price=val('stPrice'),min=val('stMin');if(!name||q<0||price<0||min<0)return toast('Periksa data bahan.');let s=db.stocks.find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.unit===unit);if(s){s.qty+=q;s.price=price;s.min=min}else{s={id:id(),name,unit,qty:q,price,min};db.stocks.push(s)}move(s,q,'Stok masuk/awal');refreshIngredientOptions();save();$('stName').value=$('stQty').value=$('stPrice').value=$('stMin').value='';toast('Stok tersimpan.')};
$('saveAdjust').onclick=()=>{let s=db.stocks.find(x=>x.id===$('adjItem').value),q=val('adjQty'),d=$('adjType').value==='in'?q:-q;if(!s||q<=0)return toast('Pilih bahan dan jumlah.');if(s.qty+d<0)return toast('Stok tidak mencukupi.');s.qty+=d;move(s,d,$('adjNote').value.trim()||'Penyesuaian manual');save();$('adjQty').value=$('adjNote').value='';toast('Penyesuaian tersimpan.')};
function refreshIngredientOptions(){
  document.querySelectorAll('#recipeRows .ing').forEach(el=>{
    const select=el.querySelector('.iid');
    const previous=select.value;
    select.innerHTML='<option value="">Pilih bahan</option>'+db.stocks.map(s=>`<option value="${s.id}">${safe(s.name)} (${s.unit})</option>`).join('');
    if(db.stocks.some(s=>s.id===previous)) select.value=previous;
    const selected=db.stocks.find(s=>s.id===select.value);
    el.querySelector('label span').textContent=selected?selected.unit:'unit';
  });
}
function addIng(){
  let el=document.createElement('div');
  el.className='grid ing';el.style.gridTemplateColumns='1fr 1fr auto';el.style.alignItems='end';
  el.innerHTML=`<div class="field"><label>Bahan</label><select class="iid"><option value="">Pilih bahan</option></select></div><div class="field"><label>Takaran (<span>unit</span>)</label><input class="iq" type="number" min="0" placeholder="Jumlah"></div><button class="btn red">Hapus</button>`;
  el.querySelector('select').onchange=e=>{let s=db.stocks.find(s=>s.id===e.target.value);el.querySelector('label span').textContent=s?s.unit:'unit';calcRecipe()};
  el.querySelector('.iq').oninput=calcRecipe;
  el.querySelector('button').onclick=()=>{el.remove();calcRecipe()};
  $('recipeRows').append(el);
  refreshIngredientOptions();
}
$('addIng').onclick=addIng;
function ings(){return [...document.querySelectorAll('.ing')].map(e=>({stockId:e.querySelector('.iid').value,qty:+e.querySelector('.iq').value||0})).filter(x=>x.stockId&&x.qty>0)}
function costOf(list){return list.reduce((a,i)=>a+(db.stocks.find(s=>s.id===i.stockId)?.price||0)*i.qty,0)}
function calcRecipe(){let c=costOf(ings()),y=val('rcYield');$('rcCost').textContent=money(c);$('rcUnit').textContent=money(y?c/y:0)}
$('rcYield').oninput=calcRecipe;
$('saveRecipe').onclick=()=>{let name=$('rcName').value.trim(),y=val('rcYield'),list=ings();if(!name||y<1||!list.length)return toast('Lengkapi resep dan minimal satu bahan.');db.recipes.push({id:id(),name,yield:y,ingredients:list});save();$('rcName').value='';$('recipeRows').innerHTML='';addIng();calcRecipe();toast('Resep disimpan.')};
function renderRecipe(){$('recipeList').innerHTML=db.recipes.length?db.recipes.map(r=>`<div class="item"><b>${safe(r.name)}</b><small>${r.yield} unit/batch · ${money(costOf(r.ingredients))}/batch</small></div>`).join(''):none('Belum ada resep.')}
function preview(){let r=db.recipes.find(r=>r.id===$('prRecipe').value),b=val('prBatch');if(!r){$('prPreview').textContent='Pilih resep untuk melihat kebutuhan bahan.';return}let lines=[],ok=true,c=0;let req={};r.ingredients.forEach(i=>req[i.stockId]=(req[i.stockId]||0)+i.qty*b);Object.entries(req).forEach(([sid,q])=>{let s=db.stocks.find(s=>s.id===sid);if(!s||s.qty<q)ok=false;if(s){c+=s.price*q;lines.push(`${safe(s.name)}: ${q} ${s.unit} (tersedia ${s.qty})`)}});$('prPreview').innerHTML='<b>Kebutuhan bahan:</b><br>'+lines.join('<br>')+`<br><br>Hasil: <b>${r.yield*b} unit</b><br>Biaya bahan: <b>${money(c)}</b><br>Status stok: <b>${ok?'Mencukupi':'Tidak mencukupi'}</b>`}
$('prRecipe').onchange=preview;$('prBatch').oninput=preview;
$('saveProduction').onclick=()=>{let r=db.recipes.find(r=>r.id===$('prRecipe').value),b=val('prBatch'),date=$('prDate').value||today();if(!r||b<1)return toast('Pilih resep dan jumlah batch.');let req={};r.ingredients.forEach(i=>req[i.stockId]=(req[i.stockId]||0)+i.qty*b);for(let [sid,q] of Object.entries(req)){let s=db.stocks.find(s=>s.id===sid);if(!s||s.qty<q)return toast('Stok tidak mencukupi. Produksi dibatalkan.')}let c=0;for(let [sid,q] of Object.entries(req)){let s=db.stocks.find(s=>s.id===sid);s.qty-=q;c+=s.price*q;move(s,-q,'Produksi '+r.name,date)}db.productions.push({recipeName:r.name,batch:b,units:r.yield*b,cost:c,date});save();toast('Produksi dicatat; stok dikurangi.')};
function renderProducts(){$('productList').innerHTML=db.products.length?db.products.map(p=>`<div class="item"><div class="row"><b>${safe(p.name)}</b><b>${money(p.price)}</b></div><small>HPP/unit ${money(p.hpp)} · ${p.yield} unit · margin ${p.margin}%</small></div>`).join(''):none('Belum ada produk. Hitung HPP lalu simpan sebagai produk.')}
$('saveFinance').onclick=()=>{let amount=val('fnAmount'),note=$('fnNote').value.trim();if(amount<=0||!note)return toast('Isi keterangan dan jumlah.');db.transactions.push({type:$('fnType').value,amount,note,date:$('fnDate').value||today()});save();$('fnNote').value=$('fnAmount').value='';toast('Transaksi tersimpan.')};
function renderFinance(){$('financeList').innerHTML=db.transactions.length?[...db.transactions].reverse().map(t=>`<div class="item row"><div><b>${safe(t.note)}</b><small>${t.date} · ${t.type==='in'?'Pemasukan':'Pengeluaran'}</small></div><b>${t.type==='in'?'+':'−'}${money(t.amount)}</b></div>`).join(''):none('Belum ada transaksi.')}
function renderReports(){let inc=sum('in'),out=sum('out');$('reportStats').innerHTML=[['Pemasukan',money(inc)],['Pengeluaran',money(out)],['Selisih kas',money(inc-out)]].map(x=>`<div class="stat"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('');let p=val('bepPrice'),v=val('bepVar'),f=val('bepFixed'),u=p>v?Math.ceil(f/(p-v)):0;$('bepUnits').textContent=u.toLocaleString('id-ID')+' unit';$('bepTurn').textContent='Omzet BEP '+money(u*p);$('reportMore').innerHTML=`Bahan: <b>${db.stocks.length}</b><br>Resep: <b>${db.recipes.length}</b><br>Produk: <b>${db.products.length}</b><br>Total hasil produksi: <b>${db.productions.reduce((a,p)=>a+p.units,0)} unit</b>`}
['bepPrice','bepVar','bepFixed'].forEach(x=>$(x).oninput=renderReports);
function backupStatus(){let s=localStorage.getItem(SNAP);$('backupStatus').innerHTML=s?`<b>Backup internal otomatis aktif</b><br>Terakhir diperbarui: ${new Date(JSON.parse(s).createdAt).toLocaleString('id-ID')}<br>${db.stocks.length} bahan · ${db.recipes.length} resep · ${db.transactions.length} transaksi`:'Belum ada snapshot backup.'}

// ===== MANAJEMEN RESEP =====
let editingRecipeId = null;

function resetRecipeForm() {
  editingRecipeId = null;
  $('rcName').value = '';
  $('rcYield').value = 10;
  $('recipeRows').innerHTML = '';
  addIng();
  calcRecipe();
  $('saveRecipe').textContent = 'Simpan resep';
}

function editRecipe(recipeId) {
  const r = db.recipes.find(x => x.id === recipeId);
  if (!r) return;

  editingRecipeId = recipeId;
  $('rcName').value = r.name;
  $('rcYield').value = r.yield;
  $('recipeRows').innerHTML = '';

  r.ingredients.forEach(i => {
    addIng();
    const row = $('recipeRows').lastElementChild;
    row.querySelector('.iid').value = i.stockId;
    row.querySelector('.iq').value = i.qty;
  });

  calcRecipe();
  $('saveRecipe').textContent = 'Perbarui resep';
  $('rcName').scrollIntoView({behavior:'smooth'});
}

function deleteRecipe(recipeId) {
  const r = db.recipes.find(x => x.id === recipeId);
  if (!r) return;

  const used = db.productions.some(p =>
    p.recipeName === r.name || p.recipeId === r.id
  );

  if (used) {
    return toast('Resep memiliki riwayat produksi dan tidak dapat dihapus.');
  }

  if (!confirm('Hapus resep ' + r.name + '?')) return;

  db.recipes = db.recipes.filter(x => x.id !== recipeId);
  save();
  toast('Resep berhasil dihapus.');
}

function renderRecipeNew() {
  $('recipeList').innerHTML = db.recipes.length
    ? db.recipes.map(r => `
      <div class="item">
        <div class="row">
          <b>${safe(r.name)}</b>
          <b>${money(costOf(r.ingredients))}/batch</b>
        </div>
        <small>${r.yield} unit/batch</small>
        <div class="btnrow">
          <button class="btn light" data-edit-recipe="${r.id}">Edit</button>
          <button class="btn red" data-delete-recipe="${r.id}">Hapus</button>
        </div>
      </div>
    `).join('')
    : none('Belum ada resep.');

  document.querySelectorAll('[data-edit-recipe]').forEach(b => {
    b.onclick = () => editRecipe(b.dataset.editRecipe);
  });

  document.querySelectorAll('[data-delete-recipe]').forEach(b => {
    b.onclick = () => deleteRecipe(b.dataset.deleteRecipe);
  });
}

$('saveRecipe').onclick = () => {
  const name = $('rcName').value.trim();
  const y = val('rcYield');
  const list = ings();

  if (!name || y < 1 || !list.length) {
    return toast('Lengkapi nama, hasil, dan bahan resep.');
  }

  if (db.recipes.some(r =>
    r.id !== editingRecipeId &&
    r.name.toLowerCase() === name.toLowerCase()
  )) {
    return toast('Nama resep sudah digunakan.');
  }

  if (editingRecipeId) {
    const r = db.recipes.find(x => x.id === editingRecipeId);
    if (!r) return toast('Resep tidak ditemukan.');

    r.history = r.history || [];
    r.history.push({
      changedAt: new Date().toISOString(),
      name: r.name,
      yield: r.yield,
      ingredients: JSON.parse(JSON.stringify(r.ingredients))
    });

    r.name = name;
    r.yield = y;
    r.ingredients = list;

    resetRecipeForm();
    save();
    toast('Resep diperbarui. Versi lama tersimpan.');
  } else {
    db.recipes.push({
      id: id(),
      name,
      yield: y,
      ingredients: list,
      history: []
    });

    resetRecipeForm();
    save();
    toast('Resep berhasil disimpan.');
  }
};

function render(){renderHome();renderStockNew();renderRecipeNew();refreshIngredientOptions();$('prRecipe').innerHTML='<option value="">Pilih resep</option>'+db.recipes.map(r=>`<option value="${r.id}">${safe(r.name)}</option>`).join('');$('productionList').innerHTML=db.productions.length?[...db.productions].reverse().map(p=>`<div class="item row"><div><b>${safe(p.recipeName)}</b><small>${p.date} · ${p.batch} batch · ${p.units} unit</small></div><b>${money(p.cost)}</b></div>`).join(''):none('Belum ada produksi.');renderProducts();renderFinance();renderReports();preview()}
async function download(text,name){
  try {
    if (Capacitor.isNativePlatform()) {
      const saved = await Filesystem.writeFile({
        path: name,
        data: text,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true
      });
      await Share.share({
        title: 'Backup Kalkulator Kuliner',
        text: 'Simpan file backup JSON ini ke Download atau Google Drive.',
        url: saved.uri,
        dialogTitle: 'Simpan backup'
      });
      toast('File backup siap dibagikan. Pilih tempat penyimpanan.');
      return;
    }

    const blob = new Blob([text], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    toast('Unduhan backup dimulai.');
  } catch (e) {
    toast('Gagal menyiapkan backup: ' + (e.message || e));
  }
}
$('downloadBackup').onclick=()=>download(JSON.stringify(snap(),null,2),`backup-kalkulator-kuliner-${today()}.json`);
$('copyBackup').onclick=async()=>{let t=JSON.stringify(snap(),null,2);try{await navigator.clipboard.writeText(t);toast('JSON disalin.')}catch(e){toast('Clipboard tidak diizinkan browser. Gunakan Unduh backup.')}}
$('restoreBackup').onclick=async()=>{let f=$('restoreFile').files[0];if(!f)return toast('Pilih file JSON.');if(!confirm('Data saat ini akan diganti. Lanjutkan?'))return;try{let o=JSON.parse((await f.text()).replace(/^\\uFEFF/,'').trim());if(typeof o==='string')o=JSON.parse(o);let d=o.data||o;if(!['stocks','recipes','productions','products','transactions','movements'].every(k=>Array.isArray(d[k])))throw Error();db={...empty(),...d};save();go('home');toast('Data berhasil dipulihkan.')}catch(e){toast('File JSON tidak valid atau rusak.')}}
$('prDate').value=today();$('fnDate').value=today();drawCosts();addIng();render();backupStatus();
// FITUR EDIT DAN HAPUS STOK
function editStock(stockId) {
  const s = db.stocks.find(x => x.id === stockId);
  if (!s) return;

  const name = prompt('Nama bahan:', s.name);
  if (name === null) return;

  const price = prompt('Harga per ' + s.unit + ' (Rp):', s.price);
  if (price === null) return;

  const min = prompt('Stok minimum:', s.min);
  if (min === null) return;

  const newPrice = Number(price);
  const newMin = Number(min);

  if (!name.trim() || !Number.isFinite(newPrice) ||
      newPrice < 0 || !Number.isFinite(newMin) || newMin < 0) {
    return toast('Data edit tidak valid.');
  }

  if (db.stocks.some(x =>
    x.id !== stockId &&
    x.name.toLowerCase() === name.trim().toLowerCase() &&
    x.unit === s.unit
  )) {
    return toast('Nama bahan tersebut sudah ada.');
  }

  s.name = name.trim();
  s.price = newPrice;
  s.min = newMin;

  save();
  toast('Data bahan berhasil diperbarui.');
}

function deleteStock(stockId) {
  const s = db.stocks.find(x => x.id === stockId);
  if (!s) return;

  if (db.recipes.some(r =>
    r.ingredients.some(i => i.stockId === stockId)
  )) {
    return toast('Bahan masih digunakan dalam resep.');
  }

  if (!confirm('Hapus bahan ' + s.name + '?')) return;

  db.stocks = db.stocks.filter(x => x.id !== stockId);
  save();
  toast('Bahan berhasil dihapus.');
}

function renderStockNew() {
  $('adjItem').innerHTML = db.stocks.map(s =>
    `<option value="${s.id}">${safe(s.name)} (${s.qty} ${s.unit})</option>`
  ).join('');

  $('stockList').innerHTML = db.stocks.length
    ? db.stocks.map(s => `
      <div class="item">
        <div class="row">
          <div>
            <b>${safe(s.name)}</b>
            <small>${s.qty} ${s.unit} · batas ${s.min} · ${money(s.price)}/${s.unit}</small>
          </div>
          <b>${money(s.qty * s.price)}</b>
        </div>
        <div class="btnrow">
          <button class="btn light" data-edit-stock="${s.id}">Edit</button>
          <button class="btn red" data-delete-stock="${s.id}">Hapus</button>
        </div>
      </div>
    `).join('')
    : none('Belum ada bahan.');

  document.querySelectorAll('[data-edit-stock]').forEach(b => {
    b.onclick = () => editStock(b.dataset.editStock);
  });

  document.querySelectorAll('[data-delete-stock]').forEach(b => {
    b.onclick = () => deleteStock(b.dataset.deleteStock);
  });

  $('stockHistory').innerHTML = db.movements.length
    ? [...db.movements].reverse().slice(0, 30).map(m => `
      <div class="item row">
        <div>
          <b>${safe(m.name)}</b>
          <small>${m.date} · ${safe(m.note)}</small>
        </div>
        <b>${m.delta > 0 ? '+' : ''}${m.delta} ${m.unit}</b>
      </div>
    `).join('')
    : none('Belum ada riwayat stok.');
}
