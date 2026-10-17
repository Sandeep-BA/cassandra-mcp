// Author: Sandeep Belgavi
document.querySelectorAll('[data-catalog]').forEach(container=>{
  const query=container.querySelector('[data-search]'), category=container.querySelector('[data-category]'), language=container.querySelector('[data-language]');
  const cards=[...container.querySelectorAll('[data-entry]')], count=container.querySelector('[data-count]'), empty=container.querySelector('[data-empty]');
  function filter(){let visible=0; const terms=query.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    for(const card of cards){const ok=terms.every(term=>card.textContent.toLowerCase().includes(term))&&(!category.value||card.dataset.category===category.value)&&(!language||!language.value||card.dataset.language===language.value);card.hidden=!ok;if(ok)visible++;}
    count.textContent=`${visible} of ${cards.length} entries`;empty.hidden=visible!==0;
  }
  [query,category,language].filter(Boolean).forEach(control=>control.addEventListener('input',filter));filter();
});
document.querySelectorAll('[data-tabs]').forEach(container=>{
  const tabs=[...container.querySelectorAll('[role=tab]')], panels=[...container.querySelectorAll('[role=tabpanel]')];
  function select(tab){for(const t of tabs){t.setAttribute('aria-selected',String(t===tab));t.tabIndex=t===tab?0:-1;}for(const panel of panels)panel.hidden=panel.id!==tab.getAttribute('aria-controls');}
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(tabs[next]);tabs[next].focus();});});
  select(tabs[0]);
});
