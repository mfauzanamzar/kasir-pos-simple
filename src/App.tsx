/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { RiDeleteBin6Line } from "react-icons/ri";
import * as XLSX from 'xlsx';

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

interface OrderItem extends MenuItem {
  qty: number;
}

interface Transaction {
  id: number;
  items: OrderItem[];
  total: number;
  time: string;
  nama: string;
}

const menuItems: MenuItem[] = [
  { id: 1, name: 'Kopi Senada', price: 18000 },
  { id: 2, name: 'Kopi Mantap', price: 18000 },
  { id: 3, name: 'Kopi Aren', price: 20000 },
  { id: 4, name: 'Ice Coffee Hazelnut', price: 23000 },
  { id: 5, name: 'Ice Coffee Caramel', price: 23000 },
  { id: 6, name: 'Ice Coffee Lemonade', price: 23000 },
  { id: 7, name: 'Ice Matcha', price: 23000 },
];

export default function KasirApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [nama, setNama] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt || !(deferredPrompt as any).prompt) return;

    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted install prompt');
    } else {
      console.log('User dismissed install prompt');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('transactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  const saveTransactions = (newTx: Transaction) => {
    const updated = [...transactions, newTx];
    setTransactions(updated);
    localStorage.setItem('transactions', JSON.stringify(updated));
  };

  const addToOrder = (item: MenuItem) => {
    const existing = orders.find((o) => o.id === item.id);
    if (existing) {
      setOrders(
        orders.map((o) =>
          o.id === item.id ? { ...o, qty: o.qty + 1 } : o
        )
      );
    } else {
      setOrders([...orders, { ...item, qty: 1 }]);
    }
  };

  const removeFromOrder = (id: number) => {
    setOrders(orders.filter((o) => o.id !== id));
  };

  const getTotal = () => {
    return orders.reduce((total, item) => total + item.price * item.qty, 0);
  };

  const handleSave = () => {
    if (orders.length === 0) return alert('Tidak ada pesanan.');
    const newTx: Transaction = {
      id: Date.now(),
      items: orders,
      total: getTotal(),
      time: new Date().toLocaleString(),
      nama: nama,
    };
    saveTransactions(newTx);
    setOrders([]);
    setNama('');
    alert('Transaksi Disimpan!');
  };


  const fitToColumn = (data: any[]) => {
    const keys = Object.keys(data[0] || {});
    return keys.map((key) => ({
      wch: Math.max(
        key.length,
        ...data.map((row) => String(row[key] || '').length)
      ) + 2 // padding
    }));
  };


  const handleClearTransactions = () => {
    const confirmClear = confirm('Apakah kamu yakin ingin menghapus semua riwayat transaksi?');
    if (confirmClear) {
      setTransactions([]);
      localStorage.removeItem('transactions');
    }
  };

  const handleExport = () => {
    // REMOVE filtering by today's date
    const allTransactions = transactions;
  
    const detailSheet = allTransactions.map(tx => ({
      'Waktu': tx.time,
      'Nama': tx.nama ? tx.nama : 'Pelanggan',
      'Item': tx.items.map(i => `${i.name} x ${i.qty}`).join(', '),
      'Total': tx.total
    }));
  
    const itemMap: Record<string, { name: string; qty: number; income: number }> = {};
    allTransactions.forEach(tx => {
      tx.items.forEach(item => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { name: item.name, qty: 0, income: 0 };
        }
        itemMap[item.name].qty += item.qty;
        itemMap[item.name].income += item.price * item.qty;
      });
    });
  
    const itemSummary = Object.values(itemMap);
    const totalIncome = itemSummary.reduce((sum, i) => sum + i.income, 0);
    const topItem = itemSummary.reduce((prev, curr) => (curr.qty > prev.qty ? curr : prev), { name: '', qty: 0, income: 0 });
  
    const summarySheet = [
      { Keterangan: 'Total Transaksi', Nilai: allTransactions.length },
      { Keterangan: 'Total Omset', Nilai: totalIncome },
      { Keterangan: 'Menu Terlaris', Nilai: topItem.name },
      { Keterangan: 'Jumlah Terjual', Nilai: topItem.qty },
    ];
  
    const totalQty = itemSummary.reduce((sum, i) => sum + i.qty, 0);
    const totalRow = { name: 'TOTAL', qty: totalQty, income: totalIncome };
    const finalItemSummary = [...itemSummary, totalRow];
  
    const ws1 = XLSX.utils.json_to_sheet(detailSheet);
    ws1['!cols'] = fitToColumn(detailSheet);
    ['A1', 'B1', 'C1'].forEach(cell => {
        ws1[cell].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F81BD' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
    });
  
    const ws2 = XLSX.utils.json_to_sheet(finalItemSummary);
    ws2['!cols'] = fitToColumn(finalItemSummary);
    ['A1', 'B1', 'C1'].forEach(cell => {
        ws2[cell].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F81BD' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
    });
  
    const ws3 = XLSX.utils.json_to_sheet(summarySheet);
    ws3['!cols'] = fitToColumn(summarySheet);
    ['A1', 'B1'].forEach(cell => {
        ws3[cell].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F81BD' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
    });
  
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Detail Transaksi');
    XLSX.utils.book_append_sheet(wb, ws2, 'Rekap Per Item');
    XLSX.utils.book_append_sheet(wb, ws3, 'Kesimpulan');
  
    const fileName = `riwayat-penjualan.xlsx`; // changed filename
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-4 max-w-7xl  mx-auto bg-[#1E3C30] min-h-screen text-white">
      <h1 className="!text-xl text-center lg:!text-4xl font-bold mb-4">Kasir Booth Kopi</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 auto-rows-fr">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className="bg-white rounded-xl p-4 shadow hover:opacity-90 h-full flex items-center justify-center"
            onClick={() => addToOrder(item)}
          >
            <div className="font-semibold">{item.name}</div>
            {/* <div className="text-sm">Rp {item.price.toLocaleString()}</div> */}
          </button>
        ))}
      </div>

      <div className="flex gap-4 lg:flex-row flex-col">


        <div className="lg:w-1/2">
          <h2 className="text-lg font-semibold mb-2">Pesanan:</h2>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Nama Pelanggan</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Masukkan nama"
              className="w-full p-2 rounded-xl border bg-white text-[#1E3C30]"
            />
          </div>
          <div className="bg-white text-[#1E3C30] p-4 rounded-xl shadow mb-4">
            {orders.length === 0 && <p>Belum ada pesanan.</p>}
            {orders.map((item) => (
              <div key={item.id} className="flex justify-between items-center mb-2 gap-4">
                <span>{item.name} x {item.qty}</span>
                <div className="flex-[0_0_135px] flex no-wrap items-center">
                  <p className="mr-2">Rp {(item.price * item.qty).toLocaleString()}</p>
                  <button className="!bg-transparent !border-0 hover:!border-0 focus:!border-0"
                    onClick={() => removeFromOrder(item.id)}
                  ><RiDeleteBin6Line className="text-red-500" /></button>
                </div> 
              </div>
            ))}
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>Rp {getTotal().toLocaleString()}</span>
            </div>
          </div>

          <button
            className="w-full bg-green-500 text-white p-3 rounded-xl shadow hover:bg-green-600 mb-4"
            onClick={handleSave}
          >
            Simpan Transaksi
          </button>

          <button
            className="w-full bg-blue-500 text-white p-3 rounded-xl shadow hover:bg-blue-600 mb-4"
            onClick={handleExport}
          >
            Download Riwayat
          </button>

          {transactions.length > 0 && (
            <button
              onClick={handleClearTransactions}
              className="w-full bg-red-500 text-white p-3 rounded-xl shadow hover:bg-red-600"
            >
              Hapus Semua Riwayat
            </button>
          )}

        </div>

        <div className="lg:w-1/2">
          <h2 className="text-lg font-semibold mb-2">Riwayat Transaksi</h2>
          <div className="bg-white text-[#1E3C30] p-4 rounded-xl shadow">
            {transactions.length === 0 && <p>Belum ada transaksi.</p>}
            {[...transactions].sort((a, b) => b.id - a.id).map((tx) => (
            <div key={tx.id} className="mb-4 border-b pb-2">
              <div className="text-sm text-gray-500">{tx.time} - <strong>{tx.nama ? tx.nama : 'Pelanggan'}</strong></div>
                {tx.items.map((i) => (
                  <div key={i.id} className="text-sm">{i.name} x {i.qty}</div>
                ))}
                <div className="font-bold">Total: Rp {tx.total.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showInstallPrompt && (
        <div className="fixed bottom-0 w-full z-50 right-0">
          <div className="bg-white text-[#1E3C30] p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-between items-center">
            <p>Install aplikasi kasir ke perangkat kamu?</p>
          <button
            onClick={handleInstallClick}
            className="bg-[#1E3C30] text-white px-4 py-2 rounded hover:bg-[#163026]"
          >
            Install
          </button>
          </div>
        </div>
      )}
    </div>
  );
}
