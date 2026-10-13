// PROTOTYPE — 使い捨て。計算は .scratch/cash-flow-simulator-v1/spec.md を簡略化したもの。
// 本実装には持ち込まない（本実装はテストを書きながら TypeScript で作り直す）。

const C = {
  basicPensionFull: 847300,
  koseiRate: 5.481 / 1000,
  pensionNet: 0.9,
  netBands: [
    [5_000_000, 0.8], [7_000_000, 0.75], [10_000_000, 0.72],
    [15_000_000, 0.68], [20_000_000, 0.64], [Infinity, 0.6],
  ],
  capitalGainsTax: 0.20315,
  loanDeductionRate: 0.007,
  loanDeductionYears: 13,
  edu: {
    kinder: { 公立: 184646, 私立: 347338 },
    elem: { 公立: 367000, 私立: 1742000 },
    junior: { 公立: 542000, 私立: 1560000 },
    high: { 公立: 597000, 私立: 1179000 },
    univ: {
      国公立: { entry: 672000, annual: 1035000 },
      私立文系: { entry: 818000, annual: 1520000 },
      私立理系: { entry: 888000, annual: 1832000 },
    },
    dormInitial: 387000,
    dormAnnual: 958000,
  },
};

const n = (v) => (Number.isFinite(+v) ? +v : 0);
const parseYM = (s) => {
  if (!s) return null;
  const [y, m] = String(s).split('-').map(Number);
  return y ? { y, m: m || 1 } : null;
};
const inBand = (age, b) => age >= n(b.from) && age <= n(b.to);
const bandAmount = (bands, age) => {
  const b = (bands || []).find((b) => inBand(age, b));
  return b ? n(b.amount) : 0;
};

function estimateNet(gross) {
  const bands = C.netBands;
  const i = bands.findIndex(([limit]) => gross <= limit);
  const v = gross * bands[i][1];
  if (i === 0) return v;
  const [lowerLimit, lowerRate] = bands[i - 1];
  return Math.max(v, lowerLimit * lowerRate);
}

function grossAt(inc, curAge, age) {
  const pts = [{ age: curAge, gross: n(inc.currentGross) }]
    .concat((inc.points || []).filter((p) => n(p.age) > curAge).map((p) => ({ age: n(p.age), gross: n(p.gross) })))
    .sort((a, b) => a.age - b.age);
  if (age >= pts[pts.length - 1].age) return pts[pts.length - 1].gross;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (age >= a.age && age < b.age) {
      if (a.gross <= 0 || b.gross <= 0) return a.gross;
      return a.gross * Math.pow(b.gross / a.gross, (age - a.age) / (b.age - a.age));
    }
  }
  return pts[0].gross;
}

function elemStartYear(child) {
  const b = parseYM(child.birth);
  return b.m <= 3 ? b.y + 6 : b.y + 7;
}

function members(plan) {
  const self = parseYM(plan.basic.self.birth);
  const married = plan.basic.self.married === '既婚';
  const spouse = married ? parseYM(plan.basic.spouse.birth) : null;
  const children = (plan.education.children || [])
    .map((c, i) => ({ ...c, idx: i, b: parseYM(c.birth) }))
    .filter((c) => c.b)
    .sort((a, b) => a.b.y * 12 + a.b.m - (b.b.y * 12 + b.b.m));
  return {
    self: self && { key: 'self', label: '本人', by: self.y, life: n(plan.basic.self.lifespan) || 100 },
    spouse: spouse && { key: 'spouse', label: '配偶者', by: spouse.y, life: n(plan.basic.spouse.lifespan) || 100 },
    children,
  };
}

function validate(plan) {
  const errors = [];
  const push = (section, msg) => errors.push({ section, msg });
  if (!parseYM(plan.basic.self.birth)) push('basic', '本人の生年月日を入力してください');
  if (plan.basic.self.married === '既婚' && !parseYM(plan.basic.spouse.birth))
    push('basic', '既婚の場合は配偶者の生年月日を入力してください');
  const overlap = (bands) => {
    const s = [...(bands || [])].sort((a, b) => n(a.from) - n(b.from));
    return s.some((b, i) => i > 0 && n(b.from) <= n(s[i - 1].to));
  };
  for (const [k, label] of LIVING_ITEMS)
    if (overlap(plan.living.items[k])) push('living', `${label}の年齢区間が重なっています`);
  for (const who of ['self', 'spouse']) {
    const ages = (plan.income[who].points || []).map((p) => n(p.age));
    if (new Set(ages).size !== ages.length) push('income', `${who === 'self' ? '本人' : '配偶者'}の年収見込みに同じ年齢があります`);
    if (overlap(plan.income[who].other)) push('income', 'その他の収入の年齢区間が重なっています');
    const sa = n(plan.pension[who].startAge);
    if (sa && (sa < 60 || sa > 75)) push('pension', '受給開始年齢は60〜75歳で入力してください');
  }
  for (const l of plan.loans || []) if (overlap(l.rates)) push('loan', '金利の年齢区間が重なっています');
  for (const e of plan.events || [])
    if (e.type === '繰り返し' && n(e.cycle) < 1) push('event', `「${e.name || '無題'}」のサイクルは1以上にしてください`);
  return errors;
}

const LIVING_ITEMS = [
  ['food', '食費'], ['utility', '水道光熱費'], ['phone', '通信費'],
  ['allowanceSelf', '小遣い（本人）'], ['allowanceSpouse', '小遣い（配偶者）'], ['medical', '医療費'],
];

// 年度列ごとの行データを返す。値はすべて円。
function simulate(plan, Y0) {
  const M = members(plan);
  if (!M.self) return null;
  const persons = [M.self, M.spouse].filter(Boolean);
  const endYear = Math.max(...persons.map((p) => p.by + p.life));
  const years = [];
  for (let y = Y0; y <= endYear; y++) years.push(y);

  const rows = {}; // key -> {label, values[], children: {key -> {label, values[]}}}
  const row = (key, label) => (rows[key] ??= { label, values: years.map(() => 0), sub: {} });
  const add = (key, label, i, v, subKey, subLabel) => {
    if (!v) return;
    const r = row(key, label);
    r.values[i] += v;
    if (subKey) {
      r.sub[subKey] ??= { label: subLabel, values: years.map(() => 0) };
      r.sub[subKey].values[i] += v;
    }
  };
  const ageOf = (p, y) => y - p.by;
  const alive = (p, y) => p && ageOf(p, y) <= p.life;

  // 資産の状態
  const assets = [];
  let deposit = 0;
  for (const p of persons) {
    const a = plan.assets[p.key];
    deposit += n(a.deposit);
    if (a.ideco?.enabled)
      assets.push({ owner: p, name: `iDeCo（${p.label}）`, ideco: true, cfg: a.ideco, bal: n(a.ideco.current), principal: n(a.ideco.current), annuity: 0, left: 0 });
    for (const f of a.funds || [])
      assets.push({ owner: p, name: `${f.name || '積立資産'}（${p.label}）`, cfg: f, bal: n(f.current), principal: n(f.principal || f.current) });
  }

  // 住宅ローンの状態
  const loans = (plan.loans || []).map((l, k) => ({ cfg: l, k, bal: 0, monthsLeft: n(l.years) * 12, payment: 0, started: false, startYear: null }));

  const out = { years, rows, deposit: [], invest: [], assetTotal: [], total: [], loanBal: [], balance: [], incomeTotal: [], expenseTotal: [], ageHeader: [] };

  years.forEach((y, i) => {
    const sAge = ageOf(M.self, y);

    // --- 収入: 給与・退職金・その他・育休
    for (const p of persons) {
      if (!alive(p, y)) continue;
      const inc = plan.income[p.key];
      const age = ageOf(p, y);
      const rowKey = p.key === 'self' ? 'incSelf' : 'incSpouse';
      const rowLabel = p.key === 'self' ? '本人収入' : '配偶者収入';
      const retire = n(inc.retireAge) || 65;
      if (age <= retire) {
        const curAge = Y0 - p.by;
        const gross = grossAt(inc, curAge, age);
        const net = y === Y0 ? n(inc.takeMonthly) * 12 + n(inc.takeBonus) : estimateNet(gross);
        let leaveMonths = 0, benefit = 0;
        for (const c of M.children) {
          const months = n(p.key === 'self' ? c.leaveSelf : c.leaveSpouse);
          for (let k = 0; k < months; k++) {
            const mi = c.b.m - 1 + k;
            if (c.b.y + Math.floor(mi / 12) === y) {
              leaveMonths++;
              benefit += (gross / 12) * (k < 6 ? 0.67 : 0.5);
            }
          }
        }
        add(rowKey, rowLabel, i, (net * Math.max(0, 12 - leaveMonths)) / 12, 'salary', '給与');
        add(rowKey, rowLabel, i, benefit, 'leave', '育児休業給付金');
      }
      if (age === retire) add(rowKey, rowLabel, i, n(inc.severance), 'severance', '退職金');
      add(rowKey, rowLabel, i, bandAmount(inc.other, age), 'other', 'その他の収入');

      // 年金
      const pen = plan.pension[p.key];
      const start = n(pen.startAge) || 65;
      if (age >= start) {
        const basic = C.basicPensionFull * Math.min(n(pen.kokumin), 40) / 40;
        const kosei = n(pen.avgIncome) * n(pen.kosei) * C.koseiRate;
        const adj = start < 65 ? 1 - 0.048 * (65 - start) : 1 + 0.084 * (start - 65);
        add(p.key === 'self' ? 'penSelf' : 'penSpouse', p.key === 'self' ? '本人年金' : '配偶者年金', i, (basic + kosei) * adj * C.pensionNet);
      }
    }

    // 児童手当
    M.children.forEach((c, order) => {
      const a = y - c.b.y;
      if (a < 0 || a > 18) return;
      const v = order >= 2 ? 360000 : a <= 2 ? 180000 : 120000;
      add('allowance', '児童手当', i, v, `c${order}`, `第${order + 1}子`);
    });

    // --- 支出: 生活費
    const infl = Math.pow(1 + n(plan.living.inflation) / 100, y - Y0);
    for (const [k, label] of LIVING_ITEMS) {
      // 世帯全体の項目は、だれかが生きている限り本人の年齢（亡くなった後も数え続ける）で計上する
      let basis = M.self;
      if (k === 'allowanceSpouse') basis = M.spouse;
      if (!basis) continue;
      if ((k === 'allowanceSelf' || k === 'allowanceSpouse') && !alive(basis, y)) continue;
      add('living', '生活費', i, bandAmount(plan.living.items[k], ageOf(basis, y)) * 12 * infl, k, label);
    }

    // 教育費
    M.children.forEach((c, order) => {
      const es = elemStartYear(c);
      const label = `第${order + 1}子`;
      const e = (v) => add('edu', '教育費', i, v, `c${order}`, label);
      const startClass = n(c.nurseryStartAge);
      for (let cls = startClass; cls <= 2; cls++) if (y === es - 6 + cls) e(n(c.nurseryMonthly) * 12);
      const ky = n(c.kinderYears) || 0;
      if (y >= es - ky && y < es) e(C.edu.kinder[c.kinder] || 0);
      if (y >= es && y < es + 6) e(C.edu.elem[c.elem] || 0);
      if (y >= es + 6 && y < es + 9) e(C.edu.junior[c.junior] || 0);
      if (y >= es + 9 && y < es + 12) e(C.edu.high[c.high] || 0);
      const u = C.edu.univ[c.univ];
      if (u && y >= es + 12 && y < es + 16) {
        e(u.annual + (c.univLiving === '下宿' ? C.edu.dormAnnual : 0));
        if (y === es + 12) e(u.entry + (c.univLiving === '下宿' ? C.edu.dormInitial : 0));
      }
      for (const x of plan.education.extras || [])
        if (n(x.child) === order + 1 && inBand(y - c.b.y, x)) e(n(x.amount));
    });

    // 住宅
    const h = plan.housing;
    if (h.current === '賃貸' && sAge <= n(h.rentUntilAge)) {
      add('housing', '住宅関連', i, n(h.rentMonthly) * 12, 'rent', '家賃');
      if ((y - Y0) % 2 === 1) add('housing', '住宅関連', i, n(h.renewalFee), 'renewal', '更新料');
    }
    if (h.purchase) {
      const pa = n(h.purchaseAge);
      if (sAge === pa) add('housing', '住宅関連', i, n(h.down) + n(h.price) * n(h.costRate) / 100, 'buy', '頭金・諸費用');
      if (sAge >= pa) {
        add('housing', '住宅関連', i, n(h.propertyTax), 'tax', '固定資産税');
        if (h.kind === 'マンション') add('housing', '住宅関連', i, n(h.maintMonthly) * 12, 'maint', '管理費・修繕積立金');
      }
      for (const r of h.reforms || []) if (sAge === n(r.age)) add('housing', '住宅関連', i, n(r.amount), 'reform', 'リフォーム');
    }
    if (h.current === '持ち家') {
      add('housing', '住宅関連', i, n(h.propertyTax), 'tax', '固定資産税');
    }

    // 住宅ローン（月ごとに計算）
    let loanBalTotal = 0;
    for (const L of loans) {
      const l = L.cfg;
      if (!L.started && sAge === n(l.age)) {
        L.started = true; L.startYear = y; L.bal = n(l.amount);
      }
      if (!L.started || L.bal <= 0) continue;
      const rate = bandAmount(l.rates, sAge) / 100 / 12;
      let paid = 0;
      if (l.method === '元利均等' && L.monthsLeft > 0)
        L.payment = rate === 0 ? L.bal / L.monthsLeft : (L.bal * rate) / (1 - Math.pow(1 + rate, -L.monthsLeft));
      for (let m = 0; m < 12 && L.bal > 0; m++) {
        const interest = L.bal * rate;
        const princ = l.method === '元利均等' ? Math.min(L.payment - interest, L.bal) : Math.min(L.bal / Math.max(L.monthsLeft, 1), L.bal);
        L.bal -= princ; paid += princ + interest; L.monthsLeft--;
      }
      for (const pp of l.prepay || []) {
        if (sAge !== n(pp.age) || L.bal <= 0) continue;
        const amt = Math.min(n(pp.amount), L.bal);
        L.bal -= amt; paid += amt;
        if (pp.kind === '期間短縮型' && l.method === '元利均等' && L.bal > 0 && L.payment > L.bal * rate) {
          L.monthsLeft = rate === 0 ? Math.ceil(L.bal / L.payment) : Math.ceil(-Math.log(1 - (L.bal * rate) / L.payment) / Math.log(1 + rate));
        }
      }
      add('housing', '住宅関連', i, paid, `loan${L.k}`, `住宅ローン返済（${l.holder || '本人'}）`);
      if (y - L.startYear < C.loanDeductionYears) add('loanDeduction', '住宅ローン控除', i, L.bal * C.loanDeductionRate);
      loanBalTotal += L.bal;
    }

    // イベント（本人の年齢）
    for (const [k, e] of (plan.events || []).entries()) {
      const from = n(e.from);
      const hit = e.type === '一回' ? sAge === from : sAge >= from && sAge <= n(e.to) && (sAge - from) % Math.max(1, n(e.cycle)) === 0;
      if (hit) add('event', 'イベント', i, n(e.amount), `e${k}`, e.name || '無題');
    }

    // 保険
    const insuredAge = (who) => {
      if (who === '本人') return sAge;
      if (who === '配偶者') return M.spouse ? ageOf(M.spouse, y) : null;
      const c = M.children[n(String(who).replace(/\D/g, '')) - 1];
      return c ? y - c.b.y : null;
    };
    for (const [k, ins] of (plan.insurance || []).entries()) {
      const a = insuredAge(ins.insured);
      if (a == null) continue;
      if (a >= n(ins.from) && a <= n(ins.to)) add('premium', '保険料', i, n(ins.monthly) * 12, `i${k}`, ins.name || '無題');
      for (const po of ins.payouts || []) {
        const hit = po.type === '一時金' ? a === n(po.age) : a >= n(po.age) && a < n(po.age) + n(po.years);
        if (hit) add('insIncome', '保険収入', i, n(po.amount), `i${k}`, ins.name || '無題');
      }
    }

    // 金融資産
    let invest = 0, assetTotal = 0;
    for (const [k, A] of assets.entries()) {
      const age = ageOf(A.owner, y);
      const c = A.cfg;
      let contrib = 0;
      if (age >= n(c.startAge) && age <= n(c.endAge) && alive(A.owner, y)) contrib = n(c.monthly) * 12;
      const r = (A.ideco ? (A.left > 0 ? 0 : n(c.rate)) : age <= n(c.endAge) ? n(c.rate) : n(c.afterRate)) / 100;
      A.bal = A.bal * (1 + r) + contrib;
      A.principal += contrib;
      invest += contrib;
      if (contrib) add('investRow', '投資系拠出', i, contrib, `a${k}`, A.name);
      let w = 0;
      if (A.ideco) {
        if (age === n(c.receiveAge)) {
          if (c.method === '年金') { A.left = n(c.years) || 5; A.annuity = A.bal / A.left; }
          else { w = A.bal; A.bal = 0; }
        }
        if (A.left > 0) { const v = Math.min(A.annuity, A.bal); w = v; A.bal -= v; A.left--; }
      } else if (age === n(c.withdrawAge) && A.bal > 0) {
        const tax = c.taxable ? Math.max(0, A.bal - A.principal) * C.capitalGainsTax : 0;
        w = A.bal - tax; A.bal = 0;
      }
      if (w) add('withdraw', '運用取り崩し', i, w, `a${k}`, A.name);
      if (A.bal) add('assetRow', '運用額', i, A.bal, `a${k}`, A.name);
      assetTotal += A.bal;
    }

    const incomeKeys = ['incSelf', 'incSpouse', 'penSelf', 'penSpouse', 'insIncome', 'allowance', 'loanDeduction', 'withdraw'];
    const expenseKeys = ['living', 'housing', 'event', 'edu', 'premium'];
    const sum = (keys) => keys.reduce((s, k) => s + (rows[k]?.values[i] || 0), 0);
    const inc = sum(incomeKeys), exp = sum(expenseKeys);
    deposit = deposit + inc - exp - invest;
    out.incomeTotal.push(inc);
    out.expenseTotal.push(exp);
    out.balance.push(inc - exp);
    out.deposit.push(deposit);
    out.invest.push(invest);
    out.assetTotal.push(assetTotal);
    out.total.push(deposit + assetTotal);
    out.loanBal.push(loanBalTotal);
  });

  out.ageHeader = [
    { label: '本人', values: years.map((y) => (alive(M.self, y) ? y - M.self.by : null)) },
    ...(M.spouse ? [{ label: '配偶者', values: years.map((y) => (alive(M.spouse, y) ? y - M.spouse.by : null)) }] : []),
    ...M.children.map((c, k) => ({ label: `第${k + 1}子`, values: years.map((y) => (y >= c.b.y ? y - c.b.y : null)) })),
  ];
  return out;
}
