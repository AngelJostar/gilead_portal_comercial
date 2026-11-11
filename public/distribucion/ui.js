export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt = n => new Intl.NumberFormat('es-MX').format(n);
export const dateLabel = date => new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')).replaceAll('.','');
const paths={
 grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 chart:'M4 3v17h17 M8 16v-4 M13 16V6 M18 16v-7',
 users:'M15 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M13.5 7.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M16 4a4 4 0 0 1 0 8 M20.5 20v-1a4.5 4.5 0 0 0-3-4',
 route:'M3 7h14l-3-3 M17 7l-3 3 M21 17H7l3 3 M7 17l3-3',
 use:'M2 12h5l3-7 4 14 3-7h5',
 box:'m3 7 9-4 9 4-9 5-9-5 M3 7v10l9 5 9-5V7 M12 12v10 M7 5l9 5',
 med:'M4 4v4a5 5 0 0 0 10 0V4 M3 4h2 M13 4h2 M9 13v3a5 5 0 0 0 10 0v-2 M21 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
 plus:'M12 5v14 M5 12h14',chevron:'m9 5 7 7-7 7',arrow:'M4 12h15 M14 6l6 6-6 6',x:'m6 6 12 12 M18 6 6 18',
 link:'m10 13 4-4 M8 15l-1 1a3.5 3.5 0 0 1-5-5l5-5a3.5 3.5 0 0 1 5 0 M15 9l1-1a3.5 3.5 0 0 1 5 5l-5 5a3.5 3.5 0 0 1-5 0',
 enter:'M4 14v5h16v-5 M12 3v10 M8 10l4 4 4-4',
 send:'M4 14v5h16v-5 M12 14V4 M8 8l4-4 4 4',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 7v5l3 2'};
export const icon = k => '<span class="icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="'+(paths[k]||'')+'"/></svg></span>';
export function button(action,label,id='',kind='link-btn',symbol=''){
  return '<button type="button" class="'+kind+'" data-action="'+esc(action)+'" data-id="'+esc(id)+'">'+(symbol?icon(symbol):'')+esc(label)+'</button>';
}
export const tag=(s,kind='')=>'<span class="tag '+kind+'">'+esc(s)+'</span>';
export const table=(headers,rows,empty='No hay registros para esta vista.')=>!rows.length?'<p class="empty">'+esc(empty)+'</p>':'<div class="table-scroll"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
export const title=(main,sub,tools='')=>'<div class="list-title"><div><h2>'+esc(main)+'</h2><p class="sub">'+esc(sub)+'</p></div><div class="tools">'+tools+'</div></div>';
export const options=(entries,selected='')=>entries.map(entry=>{
 const [value,label]=Array.isArray(entry)?entry:[entry,entry];
 return '<option value="'+esc(value)+'" '+(value===selected?'selected':'')+'>'+esc(label)+'</option>';
}).join('');
export const select=(name,entries,selected='',required=true)=>'<select id="f-'+esc(name)+'" name="'+esc(name)+'" '+(required?'required':'')+'>'+options(entries,selected)+'</select>';
export const field=(name,label,html,wide=false)=>'<div class="field '+(wide?'wide':'')+'"><label for="f-'+esc(name)+'">'+esc(label)+'</label>'+html+'</div>';
export const input=(name,type,value='',extra='')=>'<input required id="f-'+esc(name)+'" name="'+esc(name)+'" type="'+type+'" value="'+esc(value)+'" '+extra+'>';
export const detailGrid=(items)=>'<div class="detail-grid">'+items.map(([name,v])=>'<div><small>'+esc(name)+'</small><b>'+v+'</b></div>').join('')+'</div>';
export const segments=(tabs,chosen)=>'<div class="segments">'+tabs.map(([id,title])=>'<button type="button" data-action="segment" data-id="'+esc(id)+'" class="'+(id===chosen?'selected':'')+'" aria-pressed="'+(id===chosen)+'">'+esc(title)+'</button>').join('')+'</div>';
export const num=(n)=>'<b>'+fmt(n)+'</b>';
export const sum=rows=>rows.reduce((n,x)=>n+x.qty,0);
export const newest=rows=>[...rows].reverse().sort((a,b)=>b.date.localeCompare(a.date));

