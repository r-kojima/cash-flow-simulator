// PROTOTYPE — 使い捨て。本実装には持ち込まない。
const STORAGE_KEY = 'PROTOTYPE_cashflow_plans';
const YEAR = new Date().getFullYear();
const VARIANTS = [
  { key: 'A', name: '1ステップ1画面' },
  { key: 'B', name: '全ステップを縦に並べる' },
  { key: 'C', name: 'ライブプレビュー付き' },
];
const variant = (() => {
  const v = new URLSearchParams(location.search).get('variant');
  return VARIANTS.some((x) => x.key === v) ? v : 'A';
})();

const SECTIONS = [
  { id: 'basic', title: '基本情報' },
  { id: 'pension', title: '年金情報' },
  { id: 'living', title: '生活費' },
  { id: 'assets', title: '金融資産情報' },
  { id: 'income', title: '収入情報' },
  { id: 'education', title: '教育費情報' },
  { id: 'housing', title: '住宅情報' },
  { id: 'loan', title: '住宅ローン情報' },
  { id: 'event', title: 'イベント情報' },
  { id: 'insurance', title: '保険情報' },
];

// ---------------------------------------------------------------- データ
function blankPlan(name) {
  const pension = () => ({ startAge: 65, kosei: 40, kokumin: 40, avgIncome: 0 });
  const assets = () => ({
    deposit: 0,
    ideco: { enabled: false, current: 0, monthly: 0, rate: 3, startAge: '', endAge: 65, method: '一時金', receiveAge: 65, years: 10 },
    funds: [],
  });
  const income = () => ({ currentGross: 0, takeMonthly: 0, takeBonus: 0, points: [], retireAge: 65, severance: 0, other: [] });
  return {
    id: crypto.randomUUID(), version: 1, name, updatedAt: Date.now(),
    basic: { self: { birth: '', job: '会社員', married: '未婚', lifespan: 100 }, spouse: { birth: '', job: '会社員', lifespan: 100 } },
    pension: { self: pension(), spouse: pension() },
    living: { inflation: 1.0, items: { food: [], utility: [], phone: [], allowanceSelf: [], allowanceSpouse: [], medical: [] } },
    assets: { self: assets(), spouse: assets() },
    income: { self: income(), spouse: income() },
    education: { children: [], extras: [] },
    housing: {
      current: '賃貸', rentMonthly: 0, renewalFee: 0, rentUntilAge: '',
      purchase: false, purchaseAge: '', price: 0, down: 0, costRate: 7, kind: 'マンション', propertyTax: 0, maintMonthly: 0, reforms: [],
    },
    loans: [], events: [], insurance: [],
  };
}

function samplePlan(name) {
  const p = blankPlan(name);
  const b = (from, to, amount) => ({ from, to, amount });
  Object.assign(p.basic.self, { birth: `${YEAR - 31}-06-15`, married: '既婚' });
  Object.assign(p.basic.spouse, { birth: `${YEAR - 30}-09-02` });
  Object.assign(p.pension.self, { avgIncome: 5000000 });
  Object.assign(p.pension.spouse, { avgIncome: 7000000 });
  p.living.inflation = 1.5;
  Object.assign(p.living.items, {
    food: [b(31, 100, 80000)], utility: [b(31, 100, 25000)], phone: [b(31, 100, 12000)],
    allowanceSelf: [b(31, 64, 30000), b(65, 100, 20000)], allowanceSpouse: [b(30, 64, 30000), b(65, 100, 20000)],
    medical: [b(31, 100, 10000)],
  });
  p.assets.self.deposit = 1500000;
  p.assets.spouse.deposit = 2000000;
  Object.assign(p.assets.self.ideco, { enabled: true, current: 800000, monthly: 23000, rate: 3, startAge: 31, endAge: 65, method: '年金', receiveAge: 65, years: 10 });
  p.assets.self.funds.push({ name: '新NISA', type: 'NISA', monthly: 50000, rate: 4, current: 3000000, principal: 2500000, startAge: 31, endAge: 60, afterRate: 2, withdrawAge: 65, taxable: false });
  p.assets.spouse.funds.push({ name: '持株会', type: '持株', monthly: 20000, rate: 3, current: 1500000, principal: 1000000, startAge: 30, endAge: 60, afterRate: 2, withdrawAge: 65, taxable: true });
  Object.assign(p.income.self, {
    currentGross: 4800000, takeMonthly: 260000, takeBonus: 700000, retireAge: 65, severance: 15000000,
    points: [{ age: 40, gross: 5200000 }, { age: 50, gross: 6000000 }, { age: 59, gross: 6500000 }, { age: 60, gross: 4000000 }],
  });
  Object.assign(p.income.spouse, {
    currentGross: 6500000, takeMonthly: 300000, takeBonus: 1300000, retireAge: 65, severance: 20000000,
    points: [{ age: 45, gross: 8000000 }, { age: 55, gross: 9000000 }, { age: 60, gross: 5500000 }],
  });
  p.education.children.push(
    { birth: `${YEAR + 2}-05`, leaveSelf: 12, leaveSpouse: 1, nurseryMonthly: 30000, nurseryStartAge: 1, kinder: '私立', kinderYears: 3, elem: '公立', junior: '公立', high: '公立', univ: '私立文系', univLiving: '自宅' },
    { birth: `${YEAR + 4}-07`, leaveSelf: 12, leaveSpouse: 0, nurseryMonthly: 30000, nurseryStartAge: 1, kinder: '公立', kinderYears: 3, elem: '公立', junior: '私立', high: '公立', univ: '国公立', univLiving: '下宿' },
  );
  p.education.extras.push({ child: 1, name: '学童保育', from: 6, to: 9, amount: 120000 }, { child: 1, name: '塾', from: 12, to: 17, amount: 400000 });
  Object.assign(p.housing, {
    current: '賃貸', rentMonthly: 120000, renewalFee: 120000, rentUntilAge: 35,
    purchase: true, purchaseAge: 36, price: 60000000, down: 5000000, costRate: 7, kind: 'マンション', propertyTax: 150000, maintMonthly: 30000,
    reforms: [{ age: 55, amount: 3000000 }],
  });
  p.loans.push({
    holder: '本人', amount: 55000000, age: 36, years: 35, method: '元利均等',
    rates: [b(36, 45, 0.6), b(46, 100, 1.2)], prepay: [{ age: 50, amount: 5000000, kind: '期間短縮型' }],
  });
  p.events.push(
    { name: '旅行', type: '繰り返し', amount: 300000, from: 31, to: 75, cycle: 1 },
    { name: '車の買い替え', type: '繰り返し', amount: 2500000, from: 35, to: 75, cycle: 7 },
    { name: '結婚10周年', type: '一回', amount: 500000, from: 40, to: '', cycle: 1 },
  );
  p.insurance.push(
    { name: '医療保険', kind: '医療', insured: '本人', monthly: 4000, from: 31, to: 60, payouts: [] },
    { name: '学資保険', kind: '学資', insured: '第1子', monthly: 15000, from: 0, to: 17, payouts: [{ type: '一時金', age: 18, amount: 3000000, years: '' }] },
  );
  return p;
}

const store = {
  load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  },
  save(plans) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); } catch {}
  },
};
let plans = store.load();
const findPlan = (id) => plans.find((p) => p.id === id);
const persist = () => store.save(plans);
const nextName = () => {
  for (let k = 1; ; k++) if (!plans.some((p) => p.name === `プラン${k}`)) return `プラン${k}`;
};

// ---------------------------------------------------------------- 小道具
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const man = (yen) => Math.round(yen / 10000);
const fmtMan = (yen) => man(yen).toLocaleString('ja-JP');
const man1 = (yen) => (yen / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 });
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, v) {
  const ks = path.split('.');
  const last = ks.pop();
  const target = ks.reduce((o, k) => o[k], obj);
  target[last] = v;
}
const ageNow = (birth) => (birth ? YEAR - Number(String(birth).slice(0, 4)) : null);

// ---------------------------------------------------------------- フォーム部品
let P; // 編集中のプラン
const NUM_TYPES = ['yen', 'age', 'num', 'pct', 'months', 'years'];
const UNIT = { yen: '円', age: '歳', pct: '%', months: 'か月', years: '年' };

function field(label, path, type = 'text', opts = {}) {
  const v = getPath(P, path);
  const id = 'f_' + path.replace(/\./g, '_');
  if (type === 'check') {
    return `<div class="field check"><label><input type="checkbox" id="${id}" data-path="${path}" data-type="check" ${v ? 'checked' : ''}> ${esc(label)}</label></div>`;
  }
  let input;
  if (type === 'select') {
    input = `<select id="${id}" data-path="${path}" data-type="select">${opts.options
      .map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else {
    const htmlType = type === 'date' ? 'date' : type === 'month' ? 'month' : NUM_TYPES.includes(type) ? 'number' : 'text';
    const step = type === 'pct' ? '0.1' : '1';
    input = `<input id="${id}" type="${htmlType}" ${htmlType === 'number' ? `inputmode="decimal" step="${step}"` : ''} data-path="${path}" data-type="${type}" value="${esc(v)}" placeholder="${esc(opts.placeholder || '')}">`;
  }
  const unit = UNIT[type] ? `（${UNIT[type]}）` : '';
  const hint = [type === 'yen' ? yenHint(v) : '', opts.hint || ''].filter(Boolean).join('　');
  return `<div class="field"><label for="${id}">${esc(label)}${unit}</label>${input}<div class="hint" data-hint-for="${path}">${esc(hint)}</div></div>`;
}
const yenHint = (v) => (Number(v) ? `≈ ${man1(Number(v))}万円` : '');

function bands(label, path, amountLabel, amountType = 'yen', note = '') {
  const list = getPath(P, path) || [];
  const rows = list.map((b, i) => `<tr>
      <td class="age"><input type="number" data-path="${path}.${i}.from" data-type="age" value="${esc(b.from)}"></td>
      <td class="age"><input type="number" data-path="${path}.${i}.to" data-type="age" value="${esc(b.to)}"></td>
      <td><input type="number" step="${amountType === 'pct' ? '0.01' : '1'}" data-path="${path}.${i}.amount" data-type="${amountType}" value="${esc(b.amount)}">
        ${amountType === 'yen' ? `<div class="hint muted" data-hint-for="${path}.${i}.amount">${yenHint(b.amount)}</div>` : ''}</td>
      <td class="x"><button class="link danger" data-action="remove" data-path="${path}" data-index="${i}" title="削除">✕</button></td>
    </tr>`).join('');
  return `<div class="list-box">
    <div class="list-item-head"><span>${esc(label)}</span><span class="muted">${esc(note)}</span></div>
    ${list.length ? `<table class="bands-table"><thead><tr><th>開始年齢</th><th>終了年齢</th><th>${esc(amountLabel)}</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="muted">未入力（0として計算）</div>'}
    <button class="small" data-action="add" data-path="${path}" data-template="band">＋ 年齢区間を追加</button>
  </div>`;
}

function list(label, path, itemTitle, renderItem, template, addLabel) {
  const items = getPath(P, path) || [];
  return `<div class="list-box">
    <div class="list-item-head"><span>${esc(label)}</span><span class="muted">${items.length}件</span></div>
    ${items.map((it, i) => `<div class="list-item">
        <div class="list-item-head"><span>${esc(itemTitle(it, i))}</span>
          <button class="link danger small" data-action="remove" data-path="${path}" data-index="${i}">削除</button></div>
        ${renderItem(`${path}.${i}`, it, i)}
      </div>`).join('')}
    <button class="small" data-action="add" data-path="${path}" data-template="${template}">＋ ${esc(addLabel)}</button>
  </div>`;
}

const isMarried = () => P.basic.self.married === '既婚';
const memberList = () => (isMarried() ? [['self', '本人'], ['spouse', '配偶者']] : [['self', '本人']]);
const perMember = (fn) => memberList().map(([k, label]) => `<div class="member-block"><h3>${label}</h3>${fn(k, label)}</div>`).join('');
const childOptions = () => P.education.children.map((_, i) => `第${i + 1}子`);

const TEMPLATES = {
  band: (path) => {
    const l = getPath(P, path);
    const last = l[l.length - 1];
    return { from: last ? Number(last.to) + 1 : '', to: '', amount: '' };
  },
  point: () => ({ age: '', gross: '' }),
  fund: () => ({ name: '', type: 'NISA', monthly: 0, rate: 3, current: 0, principal: 0, startAge: '', endAge: 60, afterRate: 2, withdrawAge: 65, taxable: false }),
  child: () => ({ birth: '', leaveSelf: 0, leaveSpouse: 0, nurseryMonthly: 0, nurseryStartAge: 1, kinder: '公立', kinderYears: 3, elem: '公立', junior: '公立', high: '公立', univ: '国公立', univLiving: '自宅' }),
  extra: () => ({ child: 1, name: '', from: '', to: '', amount: 0 }),
  reform: () => ({ age: '', amount: 0 }),
  loan: () => ({
    holder: '本人', amount: Math.max(0, Number(P.housing.price) - Number(P.housing.down)), age: P.housing.purchaseAge || '',
    years: 35, method: '元利均等', rates: [{ from: P.housing.purchaseAge || '', to: 100, amount: 0.6 }], prepay: [],
  }),
  prepay: () => ({ age: '', amount: 0, kind: '期間短縮型' }),
  event: () => ({ name: '', type: '繰り返し', amount: 0, from: '', to: '', cycle: 1 }),
  insurance: () => ({ name: '', kind: '医療', insured: '本人', monthly: 0, from: '', to: '', payouts: [] }),
  payout: () => ({ type: '一時金', age: '', amount: 0, years: '' }),
};

// ---------------------------------------------------------------- 各大項目
const RENDER = {
  basic() {
    const s = (k) => `<div class="fields">
        ${field('生年月日', `basic.${k}.birth`, 'date')}
        ${field('職業', `basic.${k}.job`, 'select', { options: ['会社員'], hint: '参考情報（計算には使わない）' })}
        ${k === 'self' ? field('婚姻状況', 'basic.self.married', 'select', { options: ['未婚', '既婚'] }) : ''}
        ${field('設定寿命', `basic.${k}.lifespan`, 'age')}
      </div>`;
    return `<div class="member-block"><h3>本人（必須）</h3>${s('self')}</div>
      ${isMarried() ? `<div class="member-block"><h3>配偶者</h3>${s('spouse')}</div>` : '<p class="muted">婚姻状況を「既婚」にすると、配偶者の入力欄が表示されます。</p>'}`;
  },
  pension() {
    return perMember((k) => {
      const pen = P.pension[k];
      const basic = 847300 * Math.min(Number(pen.kokumin) || 0, 40) / 40;
      const kosei = (Number(pen.avgIncome) || 0) * (Number(pen.kosei) || 0) * 0.005481;
      const s = Number(pen.startAge) || 65;
      const adj = s < 65 ? 1 - 0.048 * (65 - s) : 1 + 0.084 * (s - 65);
      return `<div class="fields">
          ${field('受給開始年齢', `pension.${k}.startAge`, 'age', { hint: '60〜75歳' })}
          ${field('厚生年金加入期間', `pension.${k}.kosei`, 'years')}
          ${field('国民年金加入期間', `pension.${k}.kokumin`, 'years')}
          ${field('加入時平均年収（額面）', `pension.${k}.avgIncome`, 'yen')}
        </div>
        <div class="estimate">見込み：年 <b>${man1((basic + kosei) * adj * 0.9)}万円</b>（手取り換算）
          <span class="muted">＝(基礎 ${man1(basic)} ＋ 厚生 ${man1(kosei)}) × ${adj.toFixed(3)} × 0.9</span></div>`;
    });
  },
  living() {
    const items = LIVING_ITEMS.filter(([k]) => k !== 'allowanceSpouse' || isMarried());
    return `<div class="fields">${field('物価上昇率', 'living.inflation', 'pct', { hint: '生活費全体にかかる（教育費などにはかけない）' })}</div>
      <p class="muted">金額は今年の物価・月額で入力します。年齢は本人の年齢（小遣い（配偶者）は配偶者の年齢）です。</p>
      ${items.map(([k, label]) => bands(label, `living.items.${k}`, '月額（円）')).join('')}`;
  },
  assets() {
    return perMember((k) => {
      const id = P.assets[k].ideco;
      return `<div class="fields">${field('現在の預金残高', `assets.${k}.deposit`, 'yen', { hint: '本人と配偶者の分は合算されます' })}</div>
        <div class="list-box">
          <div class="list-item-head"><span>iDeCo</span></div>
          <div class="fields">${field('iDeCoに加入している', `assets.${k}.ideco.enabled`, 'check')}</div>
          ${id.enabled ? `<div class="fields">
            ${field('現在の運用額', `assets.${k}.ideco.current`, 'yen')}
            ${field('積立額（月額）', `assets.${k}.ideco.monthly`, 'yen')}
            ${field('利回り', `assets.${k}.ideco.rate`, 'pct')}
            ${field('積立開始年齢', `assets.${k}.ideco.startAge`, 'age')}
            ${field('積立終了年齢', `assets.${k}.ideco.endAge`, 'age')}
            ${field('受取方法', `assets.${k}.ideco.method`, 'select', { options: ['一時金', '年金'] })}
            ${field('受取開始年齢', `assets.${k}.ideco.receiveAge`, 'age')}
            ${id.method === '年金' ? field('受取年数', `assets.${k}.ideco.years`, 'years', { hint: '5〜20年' }) : ''}
          </div>` : ''}
        </div>
        ${list('毎月の積立資産', `assets.${k}.funds`, (f, i) => f.name || `積立資産 ${i + 1}`, (base) => `<div class="fields">
            ${field('保有資産名', `${base}.name`, 'text', { placeholder: '例：新NISA' })}
            ${field('資産種類', `${base}.type`, 'select', { options: ['NISA', '個別株', '持株', '投資信託', 'その他'] })}
            ${field('積立額（月額）', `${base}.monthly`, 'yen')}
            ${field('利回り', `${base}.rate`, 'pct')}
            ${field('現在の運用額', `${base}.current`, 'yen')}
            ${field('現在の元本', `${base}.principal`, 'yen')}
            ${field('積立開始年齢', `${base}.startAge`, 'age')}
            ${field('積立終了年齢', `${base}.endAge`, 'age')}
            ${field('積立終了後の利回り', `${base}.afterRate`, 'pct')}
            ${field('取り崩し年齢', `${base}.withdrawAge`, 'age', { hint: '取り崩し方法：一括のみ' })}
            ${field('課税あり', `${base}.taxable`, 'check')}
          </div>`, 'fund', '積立資産を追加')}`;
    });
  },
  income() {
    return perMember((k) => {
      const inc = P.income[k];
      const take = (Number(inc.takeMonthly) || 0) * 12 + (Number(inc.takeBonus) || 0);
      return `<div class="fields">
          ${field('現在の額面年収（参考）', `income.${k}.currentGross`, 'yen')}
          ${field('現在の手取り月収', `income.${k}.takeMonthly`, 'yen')}
          ${field('現在の手取りボーナス（年間合計）', `income.${k}.takeBonus`, 'yen')}
          ${field('退職年齢', `income.${k}.retireAge`, 'age')}
          ${field('退職金（手取り）', `income.${k}.severance`, 'yen')}
        </div>
        <div class="estimate">今年の手取り年収：<b>${man1(take)}万円</b></div>
        ${list('年収見込み（額面）', `income.${k}.points`, (pt) => (pt.age ? `${pt.age}歳のとき` : '年収見込み'), (base, pt) => `<div class="fields">
            ${field('年齢', `${base}.age`, 'age')}
            ${field('額面年収', `${base}.gross`, 'yen', { hint: pt.gross ? `手取り概算 ≈ ${man1(estimateNet(Number(pt.gross)))}万円` : '' })}
          </div>`, 'point', '年収見込みを追加')}
        <p class="muted">年収見込みと年収見込みの間は、一定の率で増減するように自動で補います。</p>
        ${bands('その他の収入（副業など・手取り）', `income.${k}.other`, '年額（円）')}`;
    });
  },
  education() {
    const C3 = ['公立', '私立'];
    return `${list('子ども', 'education.children', (c, i) => `第${i + 1}子${c.birth ? `（${c.birth}生まれ）` : ''}`, (base) => `<div class="fields">
          ${field('生年月（予定を含む）', `${base}.birth`, 'month')}
          ${field('育休（本人）', `${base}.leaveSelf`, 'months')}
          ${isMarried() ? field('育休（配偶者）', `${base}.leaveSpouse`, 'months') : ''}
          ${field('0〜2歳の保育料（月額）', `${base}.nurseryMonthly`, 'yen')}
          ${field('保育園に預け始める年齢', `${base}.nurseryStartAge`, 'select', { options: [0, 1, 2].map(String) })}
          ${field('幼稚園・保育園（3〜5歳）', `${base}.kinder`, 'select', { options: C3 })}
          ${field('幼稚園・保育園の年数', `${base}.kinderYears`, 'years', { hint: '1〜3年' })}
          ${field('小学校', `${base}.elem`, 'select', { options: C3 })}
          ${field('中学校', `${base}.junior`, 'select', { options: C3 })}
          ${field('高校', `${base}.high`, 'select', { options: C3 })}
          ${field('大学', `${base}.univ`, 'select', { options: ['国公立', '私立文系', '私立理系', '進学しない'] })}
          ${field('通学', `${base}.univLiving`, 'select', { options: ['自宅', '下宿'] })}
        </div>`, 'child', '子どもを追加')}
      ${list('追加教育費（塾・学童保育など）', 'education.extras', (x) => x.name || '追加教育費', (base) => `<div class="fields">
          ${field('対象（何人目の子ども）', `${base}.child`, 'num', { hint: childOptions().join(' / ') || '先に子どもを登録してください' })}
          ${field('項目名', `${base}.name`, 'text', { placeholder: '例：塾' })}
          ${field('開始年齢（子ども）', `${base}.from`, 'age')}
          ${field('終了年齢（子ども）', `${base}.to`, 'age')}
          ${field('年額', `${base}.amount`, 'yen')}
        </div>`, 'extra', '追加教育費を追加')}`;
  },
  housing() {
    const h = P.housing;
    return `<div class="fields">${field('今の住まい', 'housing.current', 'select', { options: ['賃貸', '持ち家'] })}</div>
      ${h.current === '賃貸' ? `<div class="fields">
        ${field('家賃（月額）', 'housing.rentMonthly', 'yen')}
        ${field('更新料（2年ごと）', 'housing.renewalFee', 'yen')}
        ${field('何歳まで住むか（本人）', 'housing.rentUntilAge', 'age')}
      </div>` : `<div class="fields">${field('固定資産税（年額）', 'housing.propertyTax', 'yen')}</div>`}
      <h3>住宅購入</h3>
      <div class="fields">${field('住宅を購入する', 'housing.purchase', 'check')}</div>
      ${h.purchase ? `<div class="fields">
        ${field('購入時の本人の年齢', 'housing.purchaseAge', 'age')}
        ${field('物件価格', 'housing.price', 'yen')}
        ${field('頭金', 'housing.down', 'yen')}
        ${field('諸費用（物件価格に対する割合）', 'housing.costRate', 'pct')}
        ${field('物件の種類', 'housing.kind', 'select', { options: ['マンション', '戸建て'] })}
        ${field('固定資産税（年額）', 'housing.propertyTax', 'yen')}
        ${h.kind === 'マンション' ? field('管理費・修繕積立金（月額）', 'housing.maintMonthly', 'yen') : ''}
      </div>
      ${list('リフォーム', 'housing.reforms', (r) => (r.age ? `${r.age}歳` : 'リフォーム'), (base) => `<div class="fields">
          ${field('本人の年齢', `${base}.age`, 'age')}${field('金額', `${base}.amount`, 'yen')}</div>`, 'reform', 'リフォームを追加')}` : ''}`;
  },
  loan() {
    return `${!P.housing.purchase ? '<p class="muted">住宅情報で「住宅を購入する」にチェックすると、借入額などの初期値が入ります。</p>' : ''}
      ${list('住宅ローン（ペアローンの場合は2件登録）', 'loans', (l, i) => `ローン ${i + 1}（${l.holder}）`, (base, l) => `<div class="fields">
          ${field('名義人', `${base}.holder`, 'select', { options: isMarried() ? ['本人', '配偶者'] : ['本人'] })}
          ${field('借入額', `${base}.amount`, 'yen')}
          ${field('借入時の本人の年齢', `${base}.age`, 'age')}
          ${field('返済期間', `${base}.years`, 'years')}
          ${field('返済方法', `${base}.method`, 'select', { options: ['元利均等', '元金均等'] })}
        </div>
        ${bands('金利（本人の年齢で区切る）', `${base}.rates`, '年利（%）', 'pct')}
        ${list('繰上返済', `${base}.prepay`, (x) => (x.age ? `${x.age}歳` : '繰上返済'), (b2) => `<div class="fields">
            ${field('本人の年齢', `${b2}.age`, 'age')}
            ${field('金額', `${b2}.amount`, 'yen')}
            ${field('種類', `${b2}.kind`, 'select', { options: ['期間短縮型', '返済額軽減型'] })}
          </div>`, 'prepay', '繰上返済を追加')}`, 'loan', '住宅ローンを追加')}`;
  },
  event() {
    return `<p class="muted">年齢はすべて本人の年齢です。サイクル1なら毎年発生します。</p>
      ${list('イベント', 'events', (e) => e.name || 'イベント', (base, e) => `<div class="fields">
          ${field('項目名', `${base}.name`, 'text', { placeholder: '例：旅行' })}
          ${field('タイプ', `${base}.type`, 'select', { options: ['繰り返し', '一回'] })}
          ${field(e.type === '一回' ? '金額' : '年額', `${base}.amount`, 'yen')}
          ${field(e.type === '一回' ? '年齢' : '開始年齢', `${base}.from`, 'age')}
          ${e.type === '繰り返し' ? field('終了年齢', `${base}.to`, 'age') + field('サイクル（何年ごと）', `${base}.cycle`, 'years') : ''}
        </div>`, 'event', 'イベントを追加')}`;
  },
  insurance() {
    const insured = ['本人', ...(isMarried() ? ['配偶者'] : []), ...childOptions()];
    return list('保険', 'insurance', (x) => x.name || '保険', (base) => `<div class="fields">
        ${field('保険名', `${base}.name`, 'text')}
        ${field('種類', `${base}.kind`, 'select', { options: ['生命', '医療', 'がん', '学資', '個人年金', 'その他'] })}
        ${field('被保険者', `${base}.insured`, 'select', { options: insured })}
        ${field('保険料（月額）', `${base}.monthly`, 'yen')}
        ${field('払込開始年齢（被保険者）', `${base}.from`, 'age')}
        ${field('払込終了年齢（被保険者）', `${base}.to`, 'age')}
      </div>
      ${list('受取', `${base}.payouts`, (po) => po.type, (b2, po) => `<div class="fields">
          ${field('タイプ', `${b2}.type`, 'select', { options: ['一時金', '年金'] })}
          ${field(po.type === '年金' ? '開始年齢' : '年齢', `${b2}.age`, 'age')}
          ${field(po.type === '年金' ? '年額' : '金額', `${b2}.amount`, 'yen')}
          ${po.type === '年金' ? field('年数', `${b2}.years`, 'years') : ''}
        </div>`, 'payout', '受取を追加')}`, 'insurance', '保険を追加');
  },
};

// ---------------------------------------------------------------- 画面
const app = document.getElementById('app');
let route = parseRoute();
const expanded = new Set();
let thin = matchMedia('(max-width: 860px)').matches;

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'p' && findPlan(parts[1])) return { view: parts[2] === 'table' ? 'table' : 'input', id: parts[1], section: parts[2] || 'basic' };
  return { view: 'list' };
}
window.addEventListener('hashchange', () => { route = parseRoute(); render(); window.scrollTo(0, 0); });

function render() {
  if (route.view === 'list') renderList();
  else if (route.view === 'table') renderTable();
  else renderInput();
  renderSwitcher();
}

function renderList() {
  P = null;
  const rows = [...plans].sort((a, b) => b.updatedAt - a.updatedAt).map((p) => `<div class="plan-row" data-id="${p.id}">
      <div class="name">${renaming === p.id
        ? `<input data-rename="${p.id}" value="${esc(p.name)}" aria-label="プラン名">`
        : `<a href="#/p/${p.id}/basic">${esc(p.name)}</a>`}
        <div class="meta">更新：${new Date(p.updatedAt).toLocaleString('ja-JP')}</div></div>
      <div class="ops">
        <button class="small" data-action="open-table" data-id="${p.id}">表を見る</button>
        <button class="small" data-action="rename" data-id="${p.id}">名前を変更</button>
        <button class="small" data-action="duplicate" data-id="${p.id}">複製</button>
        <button class="small" data-action="export" data-id="${p.id}">JSON書き出し</button>
        <button class="small danger" data-action="delete" data-id="${p.id}">${confirmingDelete === p.id ? '本当に削除する' : '削除'}</button>
      </div>
    </div>`).join('');
  app.innerHTML = `<div class="list-page">
    <div class="list-head"><h1>プラン一覧</h1>
      <div class="actions">
        <button class="primary" data-action="create">＋ プランを作成</button>
        <button data-action="create-sample">サンプルプランを作成</button>
        <button data-action="import">JSONを読み込む</button>
        <input type="file" accept="application/json,.json" id="import-file" hidden>
      </div></div>
    ${rows || '<div class="empty">プランがありません。「プランを作成」から始めてください。</div>'}
  </div>`;
  const r = app.querySelector('[data-rename]');
  if (r) { r.focus(); r.select(); }
}
let renaming = null;
let confirmingDelete = null;

function sidebar(errors) {
  const errSections = new Set(errors.map((e) => e.section));
  return `<aside class="sidebar"><nav>${SECTIONS.map((s, i) => `<a href="${variant === 'B' ? `#sec-${s.id}` : `#/p/${P.id}/${s.id}`}"
      data-sec="${s.id}" class="${variant !== 'B' && route.section === s.id ? 'current' : ''}">
      <span class="num">${i + 1}</span>${s.title}${errSections.has(s.id) ? '<span class="err" title="入力エラーあり"></span>' : ''}</a>`).join('')}</nav></aside>`;
}

function outputBox(errors) {
  return `<div class="output-box">
    <button class="primary" data-action="output" ${errors.length ? 'disabled' : ''}>キャッシュフロー表を出力</button>
    ${errors.length ? `<ul>${errors.map((e) => `<li>${esc(SECTIONS.find((s) => s.id === e.section).title)}：${esc(e.msg)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function renderInput() {
  P = findPlan(route.id);
  const errors = validate(P);
  const idx = SECTIONS.findIndex((s) => s.id === route.section);
  const sec = SECTIONS[idx] || SECTIONS[0];
  let content;
  if (variant === 'B') {
    content = SECTIONS.map((s, i) => `<section class="section-card" id="sec-${s.id}"><h2>${i + 1}. ${s.title}</h2>${RENDER[s.id]()}</section>`).join('') + outputBox(errors);
  } else {
    const prev = SECTIONS[idx - 1], next = SECTIONS[idx + 1];
    const secErrors = errors.filter((e) => e.section === sec.id);
    content = `<section class="section-card"><h2>${idx + 1}. ${sec.title}</h2>
      ${secErrors.length ? `<ul style="color:var(--danger);margin:0 0 12px">${secErrors.map((e) => `<li>${esc(e.msg)}</li>`).join('')}</ul>` : ''}
      ${RENDER[sec.id]()}</section>
      <div class="stepnav">
        ${prev ? `<a href="#/p/${P.id}/${prev.id}"><button>← ${prev.title}</button></a>` : '<span></span>'}
        ${next ? `<a href="#/p/${P.id}/${next.id}"><button class="primary">次へ：${next.title} →</button></a>` : ''}
      </div>
      ${!next ? outputBox(errors) : ''}`;
  }
  const keepScroll = window.scrollY;
  app.innerHTML = `<div class="topbar"><a href="#/"><button class="small">← プラン一覧</button></a>
      <div class="title">${esc(P.name)}</div><span class="muted" id="saved">自動保存</span></div>
    <div class="layout ${variant === 'C' ? 'with-preview' : ''}">
      ${sidebar(errors)}
      <main class="content">${content}</main>
      ${variant === 'C' ? `<aside class="preview"><div class="sticky"><h3 style="margin-top:0">プレビュー（万円）</h3><div class="scroll" id="preview"></div></div></aside>` : ''}
    </div>`;
  window.scrollTo(0, keepScroll);
  if (variant === 'C') renderPreview();
}

function renderPreview() {
  const el = document.getElementById('preview');
  if (!el) return;
  const r = simulate(P, YEAR);
  if (!r) { el.innerHTML = '<p class="muted" style="padding:8px">本人の生年月日を入力すると表示されます。</p>'; return; }
  el.innerHTML = `<table><thead><tr><th>西暦</th><th>本人</th><th>収入</th><th>支出</th><th>収支</th><th>総資産</th></tr></thead><tbody>
    ${r.years.map((y, i) => `<tr><td>${y}</td><td>${r.ageHeader[0].values[i] ?? ''}</td>
      <td>${fmtMan(r.incomeTotal[i])}</td><td>${fmtMan(r.expenseTotal[i])}</td>
      <td class="${r.balance[i] < 0 ? 'neg' : ''}" style="${r.balance[i] < 0 ? 'color:var(--danger)' : ''}">${fmtMan(r.balance[i])}</td>
      <td style="${r.total[i] < 0 ? 'color:var(--danger)' : ''}">${fmtMan(r.total[i])}</td></tr>`).join('')}
  </tbody></table>`;
}

// ---------------------------------------------------------------- キャッシュフロー表
const INCOME_ROWS = [['incSelf', '本人収入'], ['incSpouse', '配偶者収入'], ['penSelf', '本人年金'], ['penSpouse', '配偶者年金'], ['insIncome', '保険収入'], ['allowance', '児童手当'], ['loanDeduction', '住宅ローン控除'], ['withdraw', '運用取り崩し']];
const EXPENSE_ROWS = [['living', '生活費'], ['housing', '住宅関連'], ['event', 'イベント'], ['edu', '教育費'], ['premium', '保険料']];

function tableRows(r, { withSub }) {
  // [{key, label, values, cls, sub:[...]}]
  const out = [];
  const pushMain = (key, label, values, cls, subs) => {
    out.push({ key, label, values, cls, hasSub: subs.length > 0 });
    if (withSub && expanded.has(key)) subs.forEach((s) => out.push({ label: s.label, values: s.values, cls: 'sub' }));
  };
  const blank = r.years.map(() => 0);
  const rowOf = (k) => r.rows[k] || { values: blank, sub: {} };
  out.push({ label: '収入', group: true, cls: 'group' });
  for (const [k, label] of INCOME_ROWS) pushMain(k, label, rowOf(k).values, 'inc', Object.values(rowOf(k).sub));
  out.push({ label: '収入 合計', values: r.incomeTotal, cls: 'inc-total' });
  out.push({ label: '支出', group: true, cls: 'group' });
  for (const [k, label] of EXPENSE_ROWS) pushMain(k, label, rowOf(k).values, 'exp', Object.values(rowOf(k).sub));
  out.push({ label: '支出 合計', values: r.expenseTotal, cls: 'exp-total' });
  out.push({ label: '年間収支', values: r.balance, cls: 'balance' });
  out.push({ label: '預金残高', values: r.deposit, cls: '' });
  pushMain('investRow', '投資系拠出', r.invest, '', Object.values(rowOf('investRow').sub));
  pushMain('assetRow', '運用額', r.assetTotal, '', Object.values(rowOf('assetRow').sub));
  out.push({ label: '総資産', values: r.total, cls: 'grand' });
  out.push({ label: '住宅ローン残高', values: r.loanBal, cls: '' });
  return out;
}

function tableHtml(r, cols, { withSub }) {
  const head = `<thead>
    <tr><th class="rh">経過年数</th>${cols.map((i) => `<th>${i + 1}</th>`).join('')}</tr>
    <tr><th class="rh">西暦</th>${cols.map((i) => `<th>${r.years[i]}</th>`).join('')}</tr>
    ${r.ageHeader.map((h) => `<tr><th class="rh">${h.label}</th>${cols.map((i) => `<th>${h.values[i] == null ? '' : h.values[i] + '歳'}</th>`).join('')}</tr>`).join('')}
  </thead>`;
  const body = tableRows(r, { withSub }).map((row) => {
    if (row.group) return `<tr class="group"><th class="rh">${row.label}</th>${cols.map(() => '<td></td>').join('')}</tr>`;
    const toggle = withSub && row.hasSub
      ? `<button class="toggle" data-action="toggle-row" data-key="${row.key}" aria-expanded="${expanded.has(row.key)}">${expanded.has(row.key) ? '▾' : '▸'}</button>`
      : withSub ? '<span class="toggle"></span>' : '';
    return `<tr class="${row.cls}"><th class="rh">${toggle}${esc(row.label)}</th>${cols.map((i) => {
      const v = row.values[i];
      const m = man(v);
      return `<td class="${m < 0 ? 'neg' : ''}">${m === 0 ? '' : m.toLocaleString('ja-JP')}</td>`;
    }).join('')}</tr>`;
  }).join('');
  return `<table class="cf">${head}<tbody>${body}</tbody></table>`;
}

function renderTable() {
  P = findPlan(route.id);
  const errors = validate(P);
  if (errors.length) { location.hash = `#/p/${P.id}/insurance`; return; }
  const r = simulate(P, YEAR);
  const cols = r.years.map((_, i) => i).filter((i) => !thin || i % 5 === 0);
  app.innerHTML = `<div class="topbar"><a href="#/p/${P.id}/insurance"><button class="small">← 入力に戻る</button></a>
      <div class="title">${esc(P.name)}：キャッシュフロー表</div></div>
    <div class="table-page">
      <div class="table-toolbar">
        <button data-action="print">印刷</button>
        <label><input type="checkbox" data-action="thin" ${thin ? 'checked' : ''}> 5年ごとに間引いて表示</label>
        <button class="small" data-action="expand-all">すべて開く</button>
        <button class="small" data-action="collapse-all">すべて閉じる</button>
        <span class="muted">単位：万円　▸ を押すと内訳が開きます</span>
      </div>
      <div class="cf-wrap">${tableHtml(r, cols, { withSub: true })}</div>
    </div>`;
  // 印刷用：15年ごとにページを分け、大項目の行だけ
  const pages = [];
  for (let s = 0; s < r.years.length; s += 15) pages.push(r.years.slice(s, s + 15).map((_, k) => s + k));
  document.getElementById('print-area').innerHTML = pages.map((c, k) => `<div class="print-page">
      <h1>${esc(P.name)}：キャッシュフロー表（${k + 1}/${pages.length}）<span class="muted">　単位：万円</span></h1>
      ${tableHtml(r, c, { withSub: false })}</div>`).join('');
}

// ---------------------------------------------------------------- 切り替えバー
function renderSwitcher() {
  const el = document.getElementById('switcher');
  const cur = VARIANTS.find((v) => v.key === variant);
  el.innerHTML = `<span class="tag">PROTOTYPE</span>
    <button data-action="variant-prev" aria-label="前のレイアウト">◀</button>
    <span class="label">入力画面 ${cur.key}（${cur.name}）</span>
    <button data-action="variant-next" aria-label="次のレイアウト">▶</button>`;
}
function switchVariant(d) {
  const i = VARIANTS.findIndex((v) => v.key === variant);
  const next = VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length];
  const params = new URLSearchParams(location.search);
  params.set('variant', next.key);
  location.search = params.toString(); // ハッシュ（今の画面）はそのまま残る
}
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t.closest('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'ArrowLeft') switchVariant(-1);
  if (e.key === 'ArrowRight') switchVariant(1);
});

// ---------------------------------------------------------------- イベント
function readValue(el) {
  const t = el.dataset.type;
  if (t === 'check') return el.checked;
  if (NUM_TYPES.includes(t)) return el.value === '' ? '' : Number(el.value);
  return el.value;
}
let saveTimer;
function touch() {
  P.updatedAt = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist();
    const s = document.getElementById('saved');
    if (s) s.textContent = '保存しました';
  }, 250);
}

document.addEventListener('input', (e) => {
  const el = e.target;
  if (!P || !el.dataset.path) return;
  setPath(P, el.dataset.path, readValue(el));
  touch();
  const hint = document.querySelector(`[data-hint-for="${CSS.escape(el.dataset.path)}"]`);
  if (hint && el.dataset.type === 'yen') hint.textContent = yenHint(el.value);
  if (variant === 'C') renderPreview();
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'import-file') return importFile(el.files[0]);
  if (el.dataset.action === 'thin') { thin = el.checked; return renderTable(); }
  if (!P || !el.dataset.path) return;
  setPath(P, el.dataset.path, readValue(el));
  if (el.dataset.path.endsWith('.type') && el.dataset.path.includes('.funds.')) {
    setPath(P, el.dataset.path.replace(/\.type$/, '.taxable'), el.value !== 'NISA');
  }
  touch();
  renderInput(); // 表示・非表示が変わる項目とエラー表示を反映する
});

document.addEventListener('focusout', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.rename) commitRename(el);
});
document.addEventListener('keydown', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.rename) {
    if (e.key === 'Enter') commitRename(el);
    if (e.key === 'Escape') { renaming = null; renderList(); }
  }
});
function commitRename(el) {
  const p = findPlan(el.dataset.rename);
  if (!p || renaming !== p.id) return;
  const v = el.value.trim();
  if (v) { p.name = v; p.updatedAt = Date.now(); persist(); }
  renaming = null;
  renderList();
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.tagName === 'INPUT') return;
  const a = btn.dataset.action;
  const id = btn.dataset.id;
  if (a !== 'delete') confirmingDelete = null;
  switch (a) {
    case 'create':
    case 'create-sample': {
      const p = a === 'create' ? blankPlan(nextName()) : samplePlan(`サンプル（${nextName()}）`);
      plans.push(p); persist();
      location.hash = `#/p/${p.id}/basic`;
      break;
    }
    case 'import': document.getElementById('import-file').click(); break;
    case 'rename': renaming = id; renderList(); break;
    case 'duplicate': {
      const src = findPlan(id);
      const copy = { ...structuredClone(src), id: crypto.randomUUID(), name: `${src.name}のコピー`, updatedAt: Date.now() };
      plans.push(copy); persist(); renderList();
      break;
    }
    case 'delete':
      if (confirmingDelete === id) { plans = plans.filter((p) => p.id !== id); persist(); confirmingDelete = null; }
      else confirmingDelete = id;
      renderList();
      break;
    case 'export': {
      const p = findPlan(id);
      const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: `${p.name}.json` });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      break;
    }
    case 'open-table': {
      const p = findPlan(id);
      location.hash = validate(p).length ? `#/p/${id}/insurance` : `#/p/${id}/table`;
      break;
    }
    case 'add': {
      const path = btn.dataset.path;
      getPath(P, path).push(TEMPLATES[btn.dataset.template](path));
      touch(); renderInput();
      break;
    }
    case 'remove': {
      getPath(P, btn.dataset.path).splice(Number(btn.dataset.index), 1);
      touch(); renderInput();
      break;
    }
    case 'output': location.hash = `#/p/${P.id}/table`; break;
    case 'toggle-row': {
      const k = btn.dataset.key;
      expanded.has(k) ? expanded.delete(k) : expanded.add(k);
      renderTable();
      break;
    }
    case 'expand-all': [...INCOME_ROWS, ...EXPENSE_ROWS, ['investRow'], ['assetRow']].forEach(([k]) => expanded.add(k)); renderTable(); break;
    case 'collapse-all': expanded.clear(); renderTable(); break;
    case 'print': window.print(); break;
    case 'variant-prev': switchVariant(-1); break;
    case 'variant-next': switchVariant(1); break;
  }
});

function importFile(file) {
  if (!file) return;
  file.text().then((text) => {
    let p;
    try { p = JSON.parse(text); } catch { return alertInline('JSONとして読み込めませんでした'); }
    if (p.version !== 1 || !p.basic || !p.income) return alertInline('このアプリのプランの形式ではありません');
    p.id = crypto.randomUUID();
    if (plans.some((x) => x.name === p.name)) p.name = `${p.name}（読み込み）`;
    p.updatedAt = Date.now();
    plans.push(p); persist(); renderList();
  });
}
function alertInline(msg) {
  const head = app.querySelector('.list-head');
  if (!head) return;
  const div = document.createElement('div');
  div.className = 'muted';
  div.style.color = 'var(--danger)';
  div.textContent = msg;
  head.after(div);
}

render();
