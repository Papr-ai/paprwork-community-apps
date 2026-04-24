// ICP data — Sleep AI target customer profile
window.ICP_DATA = {
  name: 'AI Platform Teams',
  tagline: 'Companies running 50+ AI agents in production that have hit the reliability wall',
  profilePhoto: '',
  backgroundPhoto: '',
  filters: [
    { label: 'Running 50+ Agents', value: '68%', detail: 'Companies deploying AI agents at scale in production workflows' },
    { label: '50-2000 Employees', value: '45%', detail: 'Mid-market to enterprise with dedicated platform/infra teams' },
    { label: 'AI-Native or AI-First', value: '72%', detail: 'Companies where AI is core to the product, not a feature' },
  ],
  pipeline: [
    { stage: 'Awareness', count: 45, label: 'Product Hunt + HN launch' },
    { stage: 'Evaluation', count: 12, label: 'Free tier / POC' },
    { stage: 'Pilot', count: 2, label: 'Coda + AutoReview' },
    { stage: 'Customer', count: 2, label: 'Design partners converted' },
  ],
};
(function(){
  if (window.ROOM_DATA && window.ROOM_DATA.icp) {
    var db = window.ROOM_DATA.icp;
    if (db.title_patterns) try { window.ICP_DATA.filters = JSON.parse(db.title_patterns).map(function(t){return {label:t,value:'',detail:''}}); } catch(e){}
    if (db.description) window.ICP_DATA.tagline = db.description;
    if (db.intro_blurb) window.ICP_DATA.introBlurb = db.intro_blurb;
  }
})();
