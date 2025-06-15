/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { RiDeleteBin6Line } from "react-icons/ri";
import * as XLSX from 'xlsx';
import Modal from 'react-modal';
import { toast, Zoom } from "react-toastify";
import { ToastContainer } from "react-toastify";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: 'iceCoffee' | 'nonCoffee';
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
  status: 'pending' | 'paid';
  paymentMethod?: 'cash' | 'qris';
}

const menuItems: MenuItem[] = [
  // Ice Coffee Section
  { id: 1, name: 'Kopi Senada', price: 18000, category: 'iceCoffee' },
  { id: 2, name: 'Kopi Mantap', price: 18000, category: 'iceCoffee' },
  { id: 3, name: 'Kopi Aren', price: 20000, category: 'iceCoffee' },
  { id: 4, name: 'Ice Coffee Lemonade', price: 23000, category: 'iceCoffee' },
  { id: 5, name: 'Ice Coffee Caramel', price: 23000, category: 'iceCoffee' },
  { id: 6, name: 'Ice Coffee Huzelnut', price: 23000, category: 'iceCoffee' },
  
  // Non-Coffee Section
  { id: 8, name: 'Choco Ice', price: 20000, category: 'nonCoffee' },
  { id: 9, name: 'Redvelvet Ice', price: 20000, category: 'nonCoffee' },
  { id: 10, name: 'Taro Ice', price: 20000, category: 'nonCoffee' },
  { id: 10, name: 'Matcha Ice', price: 23000, category: 'nonCoffee' },
  { id: 10, name: 'Choco Huzelnut Ice', price: 23000, category: 'nonCoffee' },

];

export default function KasirApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [nama, setNama] = useState('');
  const [pendingOrders, setPendingOrders] = useState<OrderItem[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalDeleteHistoryIsOpen, setModalDeleteHistoryIsOpen] = useState(false);

  const openModalDeleteHistory = () => setModalDeleteHistoryIsOpen(true);
  const closeModalDeleteHistory = () => setModalDeleteHistoryIsOpen(false);

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

  const [transactions, setTransactions] = useState<Transaction[]>([]);


  useEffect(() => {
    const saved = localStorage.getItem('transactions');
    if (saved) {
      const parsedTransactions = JSON.parse(saved);
      // Set default payment method as 'cash' for existing paid transactions
      const updatedTransactions = parsedTransactions.map((tx: Transaction) => ({
        ...tx,
        paymentMethod: tx.status === 'paid' && !tx.paymentMethod ? 'cash' : tx.paymentMethod
      }));
      setTransactions(updatedTransactions);
      // Save the updated transactions back to localStorage
      localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    }
  }, []);

  const saveTransactions = (newTx: Transaction) => {
    const updated = [...transactions, newTx];
    setTransactions(updated);
    localStorage.setItem('transactions', JSON.stringify(updated));
  };

  const addToOrder = (item: MenuItem) => {
    const existing = pendingOrders.find((o) => o.id === item.id);
    if (existing) {
      setPendingOrders(
        pendingOrders.map((o) =>
          o.id === item.id ? { ...o, qty: o.qty + 1 } : o
        )
      );
    } else {
      setPendingOrders([...pendingOrders, { ...item, qty: 1 }]);
    }
  };

  const removeFromOrder = (id: number) => {
    setPendingOrders(pendingOrders.filter((o) => o.id !== id));
  };

  const getTotal = () => {
    return pendingOrders.reduce((total, item) => total + item.price * item.qty, 0);
  };

  const handleAddOrder = () => {
    if (pendingOrders.length === 0) return alert('Tidak ada pesanan.');
    const newTx: Transaction = {
      id: Date.now(),
      items: pendingOrders,
      total: getTotal(),
      time: new Date().toLocaleString(),
      nama: nama,
      status: 'pending' // Set initial status as pending
    };
    saveTransactions(newTx);
    setPendingOrders([]);
    setNama('');
    toast.success('Pesanan berhasil dibuat!');
  };

  const handleCompletePayment = (txId: number, paymentMethod: 'cash' | 'qris') => {
    const updatedTransactions = transactions.map(tx =>
      tx.id === txId
        ? { ...tx, status: 'paid', paymentMethod }
        : tx
    ) as Transaction[];
    setTransactions(updatedTransactions);
    setModalIsOpen(false);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    toast.success('Pesanan Terselesaikan');
  };


  const handleClearTransactions = () => {
    const confirmClear = confirm('Apakah kamu yakin ingin menghapus semua riwayat transaksi?');
    if (confirmClear) {
      setTransactions([]);
      localStorage.removeItem('transactions');
    }
  };

  const handleExport = () => {
    // Group transactions by date
    const transactionsByDate = transactions.reduce((acc, tx) => {
      const date = tx.time.split(',')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);

    const wb = XLSX.utils.book_new();

    // Process each day's transactions
    Object.entries(transactionsByDate).forEach(([date, dayTransactions]) => {
      // Initialize itemMap with all menu items
      const itemMap: Record<string, { name: string; qty: number; income: number }> = {};
      menuItems.forEach(item => {
        itemMap[item.name] = { name: item.name, qty: 0, income: 0 };
      });

      // Calculate daily summary
      let totalCash = 0;
      let totalQris = 0;
      dayTransactions.forEach(tx => {
        tx.items.forEach(item => {
          itemMap[item.name].qty += item.qty;
          itemMap[item.name].income += item.price * item.qty;
        });
        // Add to payment method totals
        if (tx.status === 'paid') {
          if (tx.paymentMethod === 'cash') {
            totalCash += tx.total;
          } else if (tx.paymentMethod === 'qris') {
            totalQris += tx.total;
          }
        }
      });

      const itemSummary = Object.values(itemMap);
      const totalIncome = itemSummary.reduce((sum, i) => sum + i.income, 0);
      const topItem = itemSummary.reduce((prev, curr) =>
        (curr.qty > prev.qty ? curr : prev),
        { name: '', qty: 0, income: 0 }
      );

      const totalQty = itemSummary.reduce((sum, i) => sum + i.qty, 0);
      const paidTransactions = dayTransactions.filter(tx => tx.status === 'paid').length;
      const pendingTransactions = dayTransactions.filter(tx => tx.status === 'pending').length;

      // Create combined sheet data
      const sheetData = [
        // Header
        ['LAPORAN PENJUALAN'],
        ['Tanggal', date],
        [], // Empty row for spacing

        // Summary Section
        ['RINGKASAN'],
        ['Total Transaksi', dayTransactions.length],
        ['Total Omset', totalIncome],
        ['Menu Terlaris', topItem.name],
        ['Jumlah Terjual', topItem.qty],
        ['Transaksi Dibayar', paidTransactions],
        ['Transaksi Belum Dibayar', pendingTransactions],
        ['Total Pembayaran Cash', totalCash],
        ['Total Pembayaran QRIS', totalQris],
        [], // Empty row for spacing

        // Item Summary Section
        ['REKAP PER ITEM'],
        ['Menu', 'Jumlah Terjual', 'Total Pendapatan'],
        ...itemSummary.map(item => [item.name, item.qty, item.income]),
        ['TOTAL', totalQty, totalIncome],
        [], // Empty row for spacing

        // Transaction Details Section
        ['DETAIL TRANSAKSI'],
        ['Waktu', 'Nama', 'Status', 'Metode Pembayaran', 'Item', 'Total'],
        ...dayTransactions.map(tx => [
          tx.time,
          tx.nama || 'Pelanggan',
          tx.status === 'paid' ? 'Dibayar' : 'Belum Dibayar',
          tx.paymentMethod ? (tx.paymentMethod === 'cash' ? 'Cash' : 'QRIS') : '-',
          tx.items.map(i => `${i.name} x ${i.qty}`).join(', '),
          tx.total
        ])
      ];

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Apply styling
      const titleStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E3C30' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F81BD' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Style the title
      ws['A1'].s = titleStyle;
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

      // Style section headers
      ['A4', 'A14', 'A26'].forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = titleStyle;
          ws['!merges'] = [
            ...(ws['!merges'] || []),
            { s: { r: parseInt(cell.slice(1)) - 1, c: 0 }, e: { r: parseInt(cell.slice(1)) - 1, c: 5 } }
          ];
        }
      });

      // Style headers
      ['A15', 'B15', 'C15', 'A27', 'B27', 'C27', 'D27', 'E27', 'F27'].forEach(cell => {
        if (ws[cell]) ws[cell].s = headerStyle;
      });

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Waktu
        { wch: 15 }, // Nama
        { wch: 15 }, // Status
        { wch: 15 }, // Metode Pembayaran
        { wch: 40 }, // Item
        { wch: 15 }  // Total
      ];

      // Add sheet to workbook
      const formattedDate = date.replace(/\//g, '-');
      XLSX.utils.book_append_sheet(wb, ws, formattedDate);
    });

    // Add overall summary sheet
    const allTransactions = transactions;
    const totalCashOverall = allTransactions
      .filter(tx => tx.status === 'paid' && tx.paymentMethod === 'cash')
      .reduce((sum, tx) => sum + tx.total, 0);
    const totalQrisOverall = allTransactions
      .filter(tx => tx.status === 'paid' && tx.paymentMethod === 'qris')
      .reduce((sum, tx) => sum + tx.total, 0);

    const overallSummary = [
      ['RINGKASAN KESELURUHAN'],
      ['Total Hari', Object.keys(transactionsByDate).length],
      ['Total Transaksi', allTransactions.length],
      ['Total Omset', allTransactions.reduce((sum, tx) => sum + tx.total, 0)],
      ['Transaksi Dibayar', allTransactions.filter(tx => tx.status === 'paid').length],
      ['Transaksi Belum Dibayar', allTransactions.filter(tx => tx.status === 'pending').length],
      ['Total Pembayaran Cash', totalCashOverall],
      ['Total Pembayaran QRIS', totalQrisOverall]
    ];

    const wsOverall = XLSX.utils.aoa_to_sheet(overallSummary);
    wsOverall['A1'].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3C30' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    wsOverall['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    wsOverall['!cols'] = [{ wch: 20 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, wsOverall, 'Ringkasan');

    const fileName = `riwayat-penjualan-${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-4 max-w-7xl  mx-auto bg-[#1E3C30] min-h-screen text-white">
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Zoom}
      />
      <h1 className="!text-xl text-center lg:!text-4xl font-bold mb-4">Kasir Booth Kopi</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Ice Coffee</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 auto-rows-fr">
          {menuItems
            .filter(item => item.category === 'iceCoffee')
            .map((item) => (
              <button
                key={item.id}
                className="bg-white rounded-xl p-4 shadow hover:opacity-90 h-full flex items-center justify-center"
                onClick={() => addToOrder(item)}
              >
                <div className="font-semibold">{item.name}</div>
              </button>
            ))}
        </div>

        <h2 className="text-xl font-semibold mb-3">Non-Coffee</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 auto-rows-fr">
          {menuItems
            .filter(item => item.category === 'nonCoffee')
            .map((item) => (
              <button
                key={item.id}
                className="bg-white rounded-xl p-4 shadow hover:opacity-90 h-full flex items-center justify-center"
                onClick={() => addToOrder(item)}
              >
                <div className="font-semibold">{item.name}</div>
              </button>
            ))}
        </div>
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
              className="w-full p-4 rounded-xl border bg-white text-[#1E3C30]"
            />
          </div>
          <div className="bg-white text-[#1E3C30] p-4 rounded-xl shadow mb-4">
            {pendingOrders.length === 0 && <p>Belum ada pesanan.</p>}
            {pendingOrders.map((item) => (
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
            onClick={handleAddOrder}
          >
            Tambah Pesanan
          </button>

          {/* <button
            className="w-full bg-green-500 text-white p-3 rounded-xl shadow hover:bg-green-600 mb-4"
            onClick={handleSave}
          >
            Simpan Transaksi
          </button> */}

          <button
            className="w-full bg-blue-500 text-white p-3 rounded-xl shadow hover:bg-blue-600 mb-4"
            onClick={handleExport}
          >
            Download Riwayat
          </button>

          {transactions.length > 0 && (
            <button
              onClick={openModalDeleteHistory}
              className="w-full bg-red-500 text-white p-3 rounded-xl shadow hover:bg-red-600"
            >
              Hapus Semua Riwayat
            </button>
          )}
          <Modal style={{
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
            content: {
              maxWidth: '400px',
              maxHeight: 'max-content',
              margin: 'auto',
              padding: '2rem',
              borderRadius: '10px',
              border: 'none',
              textAlign: 'center',
              inset: '20px',
            },
          }} isOpen={modalDeleteHistoryIsOpen} onRequestClose={closeModalDeleteHistory}>
            <h2 className="text-lg font-semibold text-[#1E3C30]">Hapus Semua Riwayat?</h2>
            <p className="text-sm text-[#1E3C30] mb-4">Apakah Anda yakin ingin menghapus seluruh riwayat pesanan? Tindakan ini tidak dapat dibatalkan.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <button onClick={handleClearTransactions} style={{ backgroundColor: '#dc3545', color: 'white', padding: '8px 16px', marginRight: '10px', border: 'none', borderRadius: '5px' }}>
                Hapus
              </button>
              <button onClick={closeModalDeleteHistory} style={{ padding: '8px 16px', border: '1px solid gray', borderRadius: '5px' }}>
                Batal
              </button>
            </div>
          </Modal>

        </div>

        <div className="lg:w-1/2">
          <h2 className="text-lg font-semibold mb-2">Riwayat Transaksi</h2>
          <div className="bg-white text-[#1E3C30] p-4 rounded-xl shadow">
            {transactions.length === 0 && <p>Belum ada transaksi.</p>}
            {[...transactions].sort((a, b) => b.id - a.id).map((tx) => (
              <div key={tx.id} className="mb-4 border-b pb-2">
                <div className="flex justify-between items-start">
                  <div className="text-sm text-gray-500">
                    {tx.time} - <strong>{tx.nama ? tx.nama : 'Pelanggan'}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    {tx.status === 'pending' ? (
                      <>
                        <span className="text-red-500 italic px-3 py-1 rounded-lg text-sm">
                          Belum dibayar
                        </span>
                        <button
                          onClick={() => setModalIsOpen(true)}
                          className="!bg-blue-600 !text-white !px-3 !py-1 !rounded-lg !text-sm hover:!bg-yellow-600"
                        >
                          Selesaikan
                        </button>
                        <Modal style={{
                          overlay: {
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          },
                          content: {
                            maxWidth: '400px',
                            maxHeight: '300px',
                            margin: 'auto',
                            padding: '2rem',
                            borderRadius: '10px',
                            border: 'none',
                            textAlign: 'center',
                            inset: '10px',
                          },
                        }} isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)}>
                          <h2 className="text-lg font-semibold text-[#1E3C30]">Konfirmasi Pembayaran</h2>
                          <p className="text-sm text-[#1E3C30] mb-4">Pilih metode pembayaran:</p>
                          <div className="flex flex-col gap-3">
                            <button 
                              className="!bg-green-500 !text-white !px-3 !py-2 !rounded-lg hover:!bg-green-600"
                              onClick={() => handleCompletePayment(tx.id, 'cash')}
                            >
                              Bayar Cash
                            </button>
                            <button 
                              className="!bg-blue-500 !text-white !px-3 !py-2 !rounded-lg hover:!bg-blue-600"
                              onClick={() => handleCompletePayment(tx.id, 'qris')}
                            >
                              Bayar QRIS
                            </button>
                          </div>
                        </Modal>
                      </>
                    ) : (
                      <span className="text-green-500 italic px-3 py-1 rounded-lg text-sm">
                        Sudah Dibayar ({tx.paymentMethod === 'cash' ? 'Cash' : 'QRIS'})
                      </span>
                    )}
                  </div>
                </div>
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
