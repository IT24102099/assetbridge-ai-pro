import { useState } from 'react';
import { Search, Info, ShieldCheck } from 'lucide-react';
import { MaterialCatalogItem } from '../../types/maintenance';

const CATALOG_ITEMS: MaterialCatalogItem[] = [
  {
    id: 'mat-01',
    name: 'CPVC High-Pressure Pipe (1.5" x 4m)',
    category: 'Plumbing',
    unit: 'Per Length',
    referencePriceLkr: 4850,
    estimatedLaborRatePerHourLkr: 1800,
    availabilityStatus: 'In Stock',
    lastUpdated: '12 Sep 2026',
    supplierOrStandard: 'SLS 147 Standard'
  },
  {
    id: 'mat-02',
    name: 'Brass Gate Valve (1" Heavy Duty)',
    category: 'Plumbing',
    unit: 'Per Piece',
    referencePriceLkr: 6200,
    estimatedLaborRatePerHourLkr: 1800,
    availabilityStatus: 'In Stock',
    lastUpdated: '10 Sep 2026',
    supplierOrStandard: 'Imported (Kitz Brand)'
  },
  {
    id: 'mat-03',
    name: 'Submersible Water Pump (0.5 HP)',
    category: 'Plumbing',
    unit: 'Per Unit',
    referencePriceLkr: 38500,
    estimatedLaborRatePerHourLkr: 2500,
    availabilityStatus: 'In Stock',
    lastUpdated: '08 Sep 2026',
    supplierOrStandard: 'Pedrollo / CE Certified'
  },
  {
    id: 'mat-04',
    name: 'Main Distribution Board (8-Way Double Pole)',
    category: 'Electrical',
    unit: 'Per Unit',
    referencePriceLkr: 14500,
    estimatedLaborRatePerHourLkr: 2200,
    availabilityStatus: 'In Stock',
    lastUpdated: '14 Sep 2026',
    supplierOrStandard: 'Orange Electric (CEB Approved)'
  },
  {
    id: 'mat-05',
    name: 'Copper Armoured Cable (4-Core 6mm²)',
    category: 'Electrical',
    unit: 'Per Meter',
    referencePriceLkr: 2400,
    estimatedLaborRatePerHourLkr: 2000,
    availabilityStatus: 'In Stock',
    lastUpdated: '05 Sep 2026',
    supplierOrStandard: 'ACL Cables SLS 412'
  },
  {
    id: 'mat-06',
    name: 'Elastomeric Waterproofing Membrane (20L Drum)',
    category: 'Roofing',
    unit: 'Per Drum',
    referencePriceLkr: 28500,
    estimatedLaborRatePerHourLkr: 2000,
    availabilityStatus: 'In Stock',
    lastUpdated: '15 Sep 2026',
    supplierOrStandard: 'Sika TopSeal 107'
  },
  {
    id: 'mat-07',
    name: 'Clay Roofing Tiles (Semi-Glazed Calicut)',
    category: 'Roofing',
    unit: 'Per 100 Units',
    referencePriceLkr: 18000,
    estimatedLaborRatePerHourLkr: 1900,
    availabilityStatus: 'Available On Order',
    lastUpdated: '01 Sep 2026',
    supplierOrStandard: 'Dankotuwa Porcelain Tile'
  },
  {
    id: 'mat-08',
    name: 'R410A Inverter Refrigerant Gas Refill',
    category: 'HVAC',
    unit: 'Per Service Call',
    referencePriceLkr: 12500,
    estimatedLaborRatePerHourLkr: 2500,
    availabilityStatus: 'In Stock',
    lastUpdated: '16 Sep 2026',
    supplierOrStandard: 'DuPont / Honeywell Pure'
  },
  {
    id: 'mat-09',
    name: 'Weather-Shield Exterior Acrylic Paint (20L)',
    category: 'Painting',
    unit: 'Per Drum',
    referencePriceLkr: 34000,
    estimatedLaborRatePerHourLkr: 1600,
    availabilityStatus: 'In Stock',
    lastUpdated: '11 Sep 2026',
    supplierOrStandard: 'Dulux Weathershield Max'
  },
  {
    id: 'mat-10',
    name: 'Solid Teak Flush Door Leaf (3ft x 7ft)',
    category: 'Structural',
    unit: 'Per Leaf',
    referencePriceLkr: 58000,
    estimatedLaborRatePerHourLkr: 2200,
    availabilityStatus: 'Available On Order',
    lastUpdated: '04 Sep 2026',
    supplierOrStandard: 'Kiln-Dried Treated Teak'
  }
];

export default function MaterialCatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Plumbing', 'Electrical', 'Roofing', 'HVAC', 'Painting', 'Structural'];

  const filtered = CATALOG_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplierOrStandard.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Material & Service Pricing Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard Sri Lankan reference rates in LKR for verified contractor quotation validation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            LKR Benchmark 2026
          </span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-900 to-slate-900 text-white shadow-xs flex items-center gap-3">
        <Info className="h-5 w-5 text-cyan-400 shrink-0" />
        <p className="text-xs text-slate-200 leading-relaxed">
          These rates serve as standard price validation benchmarks when comparing submitted contractor quotations to ensure overseas asset owners receive transparent and competitive market rates.
        </p>
      </div>

      {/* Filter and Category Pills */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog materials, standard specs, or brands..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Material / Service Item</th>
                <th className="py-3.5 px-4">Trade Category</th>
                <th className="py-3.5 px-4">Unit Specification</th>
                <th className="py-3.5 px-4">Reference Material Rate (LKR)</th>
                <th className="py-3.5 px-4">Labor Rate (LKR/hr)</th>
                <th className="py-3.5 px-4">Market Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                      <span className="text-[10px] text-slate-400">Spec: {item.supplierOrStandard}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-[11px]">
                      {item.category}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {item.unit}
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-blue-900 block">
                      LKR {item.referencePriceLkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-700 font-medium">
                    LKR {item.estimatedLaborRatePerHourLkr.toLocaleString()}/hr
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.availabilityStatus === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.availabilityStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500">
          Displaying {filtered.length} standard trade items • Indexed against Colombo & Kandy wholesale material benchmarks
        </div>
      </div>
    </div>
  );
}
