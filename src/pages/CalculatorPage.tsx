import { useState, useMemo } from 'react';
import { Calculator, RotateCcw, DollarSign, Percent, Calendar, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type CalcMethod = 'simple' | 'compound' | 'flat';

interface CalcResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPayable: number;
  schedule: { month: number; payment: number; interest: number; principal: number; balance: number }[];
}

function calculateLoan(principal: number, annualRate: number, termMonths: number, method: CalcMethod): CalcResult {
  if (principal <= 0 || termMonths <= 0) {
    return { monthlyPayment: 0, totalInterest: 0, totalPayable: 0, schedule: [] };
  }

  const r = annualRate / 100 / 12;

  if (method === 'flat') {
    const totalInterest = principal * (annualRate / 100) * (termMonths / 12);
    const totalPayable = principal + totalInterest;
    const monthlyPayment = totalPayable / termMonths;
    const schedule: CalcResult['schedule'] = [];
    let balance = totalPayable;
    for (let m = 1; m <= termMonths; m++) {
      balance -= monthlyPayment;
      schedule.push({ month: m, payment: monthlyPayment, interest: totalInterest / termMonths, principal: monthlyPayment - totalInterest / termMonths, balance: Math.max(0, balance) });
    }
    return { monthlyPayment, totalInterest, totalPayable, schedule };
  }

  if (method === 'simple') {
    const totalInterest = principal * r * termMonths;
    const totalPayable = principal + totalInterest;
    const monthlyPayment = totalPayable / termMonths;
    const schedule: CalcResult['schedule'] = [];
    let balance = totalPayable;
    for (let m = 1; m <= termMonths; m++) {
      balance -= monthlyPayment;
      schedule.push({ month: m, payment: monthlyPayment, interest: totalInterest / termMonths, principal: monthlyPayment - totalInterest / termMonths, balance: Math.max(0, balance) });
    }
    return { monthlyPayment, totalInterest, totalPayable, schedule };
  }

  // compound (amortized)
  if (r === 0) {
    const monthlyPayment = principal / termMonths;
    const schedule: CalcResult['schedule'] = [];
    let balance = principal;
    for (let m = 1; m <= termMonths; m++) {
      balance -= monthlyPayment;
      schedule.push({ month: m, payment: monthlyPayment, interest: 0, principal: monthlyPayment, balance: Math.max(0, balance) });
    }
    return { monthlyPayment, totalInterest: 0, totalPayable: principal, schedule };
  }

  const monthlyPayment = (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  const totalPayable = monthlyPayment * termMonths;
  const totalInterest = totalPayable - principal;
  const schedule: CalcResult['schedule'] = [];
  let balance = principal;
  for (let m = 1; m <= termMonths; m++) {
    const interest = balance * r;
    const principalPart = monthlyPayment - interest;
    balance -= principalPart;
    schedule.push({ month: m, payment: monthlyPayment, interest, principal: principalPart, balance: Math.max(0, balance) });
  }
  return { monthlyPayment, totalInterest, totalPayable, schedule };
}

export function CalculatorPage() {
  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('12');
  const [term, setTerm] = useState('12');
  const [method, setMethod] = useState<CalcMethod>('simple');

  const result = useMemo(() => {
    return calculateLoan(
      parseFloat(principal) || 0,
      parseFloat(rate) || 0,
      parseInt(term) || 0,
      method
    );
  }, [principal, rate, term, method]);

  const reset = () => {
    setPrincipal('10000');
    setRate('12');
    setTerm('12');
    setMethod('simple');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Input panel */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Loan Calculator</h3>
              <p className="text-sm text-slate-500">Calculate loan payments automatically</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <DollarSign size={18} className="absolute left-3 top-9 text-slate-400" />
              <Input
                label="Loan Amount"
                type="number"
                step="0.01"
                min="0"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Percent size={18} className="absolute left-3 top-9 text-slate-400" />
              <Input
                label="Annual Interest Rate (%)"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar size={18} className="absolute left-3 top-9 text-slate-400" />
              <Input
                label="Term (months)"
                type="number"
                min="1"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              label="Interest Method"
              value={method}
              onChange={(e) => setMethod(e.target.value as CalcMethod)}
            >
              <option value="simple">Simple Interest</option>
              <option value="compound">Compound (Amortized)</option>
              <option value="flat">Flat Rate</option>
            </Select>

            <Button variant="secondary" onClick={reset} className="w-full">
              <RotateCcw size={16} />
              Reset
            </Button>
          </div>
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <p className="text-sm text-primary-700 font-medium">Monthly Payment</p>
              <p className="text-2xl font-bold text-primary-800 mt-2">{formatCurrency(result.monthlyPayment)}</p>
            </div>
            <div className="card p-5 bg-gradient-to-br from-warning-50 to-warning-100 border-warning-200">
              <p className="text-sm text-warning-700 font-medium">Total Interest</p>
              <p className="text-2xl font-bold text-warning-800 mt-2">{formatCurrency(result.totalInterest)}</p>
            </div>
            <div className="card p-5 bg-gradient-to-br from-accent-50 to-accent-100 border-accent-200">
              <p className="text-sm text-accent-700 font-medium">Total Payable</p>
              <p className="text-2xl font-bold text-accent-800 mt-2">{formatCurrency(result.totalPayable)}</p>
            </div>
          </div>

          {/* Amortization schedule */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200">
              <TrendingUp size={18} className="text-primary-600" />
              <h3 className="text-base font-semibold text-slate-800">Amortization Schedule</h3>
            </div>
            {result.schedule.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500 text-center">Enter valid values to see the payment schedule.</p>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="table-header">Month</th>
                      <th className="table-header">Payment</th>
                      <th className="table-header">Interest</th>
                      <th className="table-header">Principal</th>
                      <th className="table-header">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.schedule.map((row) => (
                      <tr key={row.month} className="hover:bg-slate-50 transition">
                        <td className="table-cell font-medium text-slate-600">{row.month}</td>
                        <td className="table-cell font-semibold text-slate-800">{formatCurrency(row.payment)}</td>
                        <td className="table-cell text-warning-600">{formatCurrency(row.interest)}</td>
                        <td className="table-cell text-primary-600">{formatCurrency(row.principal)}</td>
                        <td className="table-cell text-slate-500">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
