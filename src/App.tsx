/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { RiDeleteBin6Line } from "react-icons/ri";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Modal from 'react-modal';
import { toast, Zoom } from "react-toastify";
import { ToastContainer } from "react-toastify";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: 'iceCoffee' | 'hotCoffee' | 'nonCoffee';
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
  { id: 7, name: 'Americano', price: 13000, category: 'iceCoffee' },
  { id: 13, name: 'Caramel Macchiato', price: 23000, category: 'iceCoffee' },
  { id: 14, name: 'Salted Caramel', price: 23000, category: 'iceCoffee' },
  { id: 15, name: 'Coffee Hazelnut', price: 23000, category: 'iceCoffee' },
  { id: 16, name: 'Coffee Pandan', price: 23000, category: 'iceCoffee' },

  // Hot Coffee Section
  { id: 20, name: 'Kopi Mantap Hot', price: 15000, category: 'hotCoffee' },
  { id: 21, name: 'Kopi Aren Hot', price: 15000, category: 'hotCoffee' },
  { id: 22, name: 'Caramel Macchiato Hot', price: 18000, category: 'hotCoffee' },
  { id: 23, name: 'Salted Caramel Hot', price: 18000, category: 'hotCoffee' },
  { id: 24, name: 'Coffee Hazelnut Hot', price: 18000, category: 'hotCoffee' },
  { id: 25, name: 'Coffee Pandan Hot', price: 18000, category: 'hotCoffee' },
  { id: 26, name: 'Choco hot', price: 15000, category: 'hotCoffee' },
  { id: 27, name: 'Redvelvet hot', price: 15000, category: 'hotCoffee' },
  
  // Non-Coffee Section
  { id: 8, name: 'Choco Ice', price: 20000, category: 'nonCoffee' },
  { id: 9, name: 'Redvelvet Ice', price: 20000, category: 'nonCoffee' },
  { id: 10, name: 'Taro Ice', price: 20000, category: 'nonCoffee' },
  { id: 11, name: 'Matcha Ice', price: 23000, category: 'nonCoffee' },
  { id: 12, name: 'Choco Huzelnut Ice', price: 23000, category: 'nonCoffee' },
  { id: 17, name: 'Vanilla Regal', price: 23000, category: 'nonCoffee' },

];

export default function KasirApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [nama, setNama] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]); // Add order date state
  const [orderTime, setOrderTime] = useState(new Date().toTimeString().slice(0, 5)); // Add order time state
  const [enableCustomDateTime, setEnableCustomDateTime] = useState(false); // Toggle for custom date/time
  const [pendingOrders, setPendingOrders] = useState<OrderItem[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalDeleteHistoryIsOpen, setModalDeleteHistoryIsOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);

  const openModalDeleteHistory = () => setModalDeleteHistoryIsOpen(true);
  const closeModalDeleteHistory = () => setModalDeleteHistoryIsOpen(false);

  const openPaymentModal = (txId: number) => {
    setSelectedTransactionId(txId);
    setModalIsOpen(true);
  };

  const closePaymentModal = () => {
    setModalIsOpen(false);
    setSelectedTransactionId(null);
  };

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
    
    let formattedTime: string;
    
    if (!enableCustomDateTime) {
      // Use current date/time if custom date/time is not enabled
      formattedTime = new Date().toLocaleString();
    } else {
      // Use selected date/time if custom date/time is enabled
      const selectedDateTime = new Date(`${orderDate}T${orderTime}`);
      formattedTime = selectedDateTime.toLocaleString();
    }
    
    const newTx: Transaction = {
      id: Date.now(),
      items: pendingOrders,
      total: getTotal(),
      time: formattedTime,
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
    // Group transactions by date from time field
    const transactionsByDate = transactions.reduce((acc, tx) => {
      const date = tx.time.split(',')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);

    const workbook = new ExcelJS.Workbook();

    // Process each day's transactions
    Object.entries(transactionsByDate).forEach(([date, dayTransactions]) => {
      // Sanitize date for worksheet name - remove invalid characters
      const sanitizedDate = date.replace(/[/\\*?:[\]]/g, '-');
      const worksheet = workbook.addWorksheet(sanitizedDate);

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

  
      // 1. LAPORAN PENJUALAN Section
      const titleRow = worksheet.addRow(['', '', 'LAPORAN PENJUALAN']);
      titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
      // Color only the actual data columns (2 columns: C, D)
      titleRow.getCell('C').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      titleRow.getCell('D').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      worksheet.mergeCells(`C1:D1`);
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRow(['', '', 'Tanggal', date]);
      worksheet.addRow([]); // Empty row for spacing

      // 2. REKAP PER ITEM Section
      const itemHeader = worksheet.addRow(['', '', 'REKAP PER ITEM']);
      itemHeader.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
      // Color only the actual data columns (3 columns: C, D, E)
      itemHeader.getCell('C').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      itemHeader.getCell('D').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      itemHeader.getCell('E').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      worksheet.mergeCells(`C${itemHeader.number}:E${itemHeader.number}`);
      itemHeader.alignment = { horizontal: 'center', vertical: 'middle' };

      const itemTableHeader = worksheet.addRow(['', '', 'Menu', 'Jumlah Terjual', 'Total Pendapatan']);
      // Color only the actual data columns (3 columns: C, D, E)
      itemTableHeader.getCell('C').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      itemTableHeader.getCell('D').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      itemTableHeader.getCell('E').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      itemTableHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
      itemTableHeader.alignment = { horizontal: 'center', vertical: 'middle' };

      itemSummary.forEach(item => worksheet.addRow(['', '', item.name, item.qty, item.income]));
      const totalRow = worksheet.addRow(['', '', 'TOTAL', totalQty, totalIncome]);
      totalRow.font = { bold: true };
      totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6E6E6' } };

      // 3. DETAIL TRANSAKSI Section
      worksheet.addRow([]); // Empty row for spacing
      const detailHeader = worksheet.addRow(['', '', 'DETAIL TRANSAKSI']);
      detailHeader.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
      // Color only the actual data columns (6 columns: C, D, E, F, G, H)
      detailHeader.getCell('C').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      detailHeader.getCell('D').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      detailHeader.getCell('E').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      detailHeader.getCell('F').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      detailHeader.getCell('G').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      detailHeader.getCell('H').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      worksheet.mergeCells(`C${detailHeader.number}:H${detailHeader.number}`);
      detailHeader.alignment = { horizontal: 'center', vertical: 'middle' };

      const detailTableHeader = worksheet.addRow(['', '', 'Waktu', 'Nama', 'Status', 'Metode Pembayaran', 'Item', 'Total']);
      // Color only the actual data columns (6 columns: C, D, E, F, G, H)
      detailTableHeader.getCell('C').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      detailTableHeader.getCell('D').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      detailTableHeader.getCell('E').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      detailTableHeader.getCell('F').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      detailTableHeader.getCell('G').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      detailTableHeader.getCell('H').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F81BD' } };
      detailTableHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
      detailTableHeader.alignment = { horizontal: 'center', vertical: 'middle' };

      dayTransactions.forEach(tx => {
        worksheet.addRow([
          '', '',
          tx.time,
          tx.nama || 'Pelanggan',
          tx.status === 'paid' ? 'Dibayar' : 'Belum Dibayar',
          tx.paymentMethod ? (tx.paymentMethod === 'cash' ? 'Cash' : 'QRIS') : '-',
          tx.items.map(i => `${i.name} x ${i.qty}`).join(', '),
          tx.total
        ]);
      });

      // 4. RINGKASAN Section
      worksheet.addRow([]); // Empty row for spacing
      const summaryHeader = worksheet.addRow(['', '', 'RINGKASAN']);
      summaryHeader.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
      // Color only the actual data columns (2 columns: C, D)
      summaryHeader.getCell('C').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      summaryHeader.getCell('D').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
      worksheet.mergeCells(`C${summaryHeader.number}:D${summaryHeader.number}`);
      summaryHeader.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRow(['', '', 'Total Transaksi', dayTransactions.length]);
      worksheet.addRow(['', '', 'Total Omset', totalIncome]);
      worksheet.addRow(['', '', 'Menu Terlaris', topItem.name]);
      worksheet.addRow(['', '', 'Jumlah Terjual', topItem.qty]);
      worksheet.addRow(['', '', 'Transaksi Dibayar', paidTransactions]);
      worksheet.addRow(['', '', 'Transaksi Belum Dibayar', pendingTransactions]);
      worksheet.addRow(['', '', 'Total Pembayaran Cash', totalCash]);
      worksheet.addRow(['', '', 'Total Pembayaran QRIS', totalQris]);

      // Set column widths based on new layout (starting from column C)
      const columnWidths = [
        { key: 'A', width: 5 },  // Empty column
        { key: 'B', width: 5 },  // Empty column
        { key: 'C', width: 20 }, // Waktu
        { key: 'D', width: 15 }, // Nama
        { key: 'E', width: 15 }, // Status
        { key: 'F', width: 30 }, // Metode Pembayaran
        { key: 'G', width: 40 }, // Item
        { key: 'H', width: 30 }  // Total
      ];
      worksheet.columns = columnWidths;

      // Auto-fit columns based on content
      worksheet.columns.forEach(column => {
        if (column.key) {
          column.width = Math.max(column.width || 10, 20); // Minimum width of 15
        }
      });

      // Auto-fit rows
      for (let i = 1; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (row.height) {
          row.height = Math.max(row.height, 30); // Minimum height of 20
        }
      }

      // Add borders to data tables (starting from column C)
      const detailDataRange = worksheet.getCell(`C${detailTableHeader.number + 1}:H${worksheet.rowCount}`);
      detailDataRange.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add overall summary sheet
    const allTransactions = transactions;
    const totalCashOverall = allTransactions
      .filter(tx => tx.status === 'paid' && tx.paymentMethod === 'cash')
      .reduce((sum, tx) => sum + tx.total, 0);
    const totalQrisOverall = allTransactions
      .filter(tx => tx.status === 'paid' && tx.paymentMethod === 'qris')
      .reduce((sum, tx) => sum + tx.total, 0);

    const overallSummarySheet = workbook.addWorksheet('Ringkasan');
    
    const overallTitle = overallSummarySheet.addRow(['RINGKASAN KESELURUHAN']);
    overallTitle.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
    overallTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3C30' } };
    overallSummarySheet.mergeCells('A1:B1');
    overallTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    overallSummarySheet.addRow(['Total Hari', Object.keys(transactionsByDate).length]);
    overallSummarySheet.addRow(['Total Transaksi', allTransactions.length]);
    overallSummarySheet.addRow(['Total Omset', allTransactions.reduce((sum, tx) => sum + tx.total, 0)]);
    overallSummarySheet.addRow(['Transaksi Dibayar', allTransactions.filter(tx => tx.status === 'paid').length]);
    overallSummarySheet.addRow(['Transaksi Belum Dibayar', allTransactions.filter(tx => tx.status === 'pending').length]);
    overallSummarySheet.addRow(['Total Pembayaran Cash', totalCashOverall]);
    overallSummarySheet.addRow(['Total Pembayaran QRIS', totalQrisOverall]);

    // Set column widths for summary sheet
    overallSummarySheet.columns = [
      { key: 'A', width: 20 },
      { key: 'B', width: 15 }
    ];

    const fileName = `riwayat-penjualan-${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);
    });
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
                className="rounded-xl p-4 shadow hover:opacity-90 h-full flex items-center justify-center"
                onClick={() => addToOrder(item)}
              >
                <div className="font-semibold">{item.name}</div>
              </button>
            ))}
        </div>

        <h2 className="text-xl font-semibold mb-3">Hot Coffee</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 auto-rows-fr">
          {menuItems
            .filter(item => item.category === 'hotCoffee')
            .map((item) => (
              <button
                key={item.id}
                className="rounded-xl p-4 shadow hover:opacity-90 h-full flex items-center justify-center"
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
                className="rounded-xl p-4 shadow hover:opacity-90 h-full flex items-center justify-center"
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
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Atur Tanggal & Waktu Kustom</label>
                             <div className="flex items-center">
                 <button
                   type="button"
                   onClick={() => setEnableCustomDateTime(!enableCustomDateTime)}
                   className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 ease-in-out !p-0 focus:outline-none ${
                     enableCustomDateTime 
                       ? '!bg-primary' 
                       : '!bg-gray-400'
                   }`}
                 >
                   <span
                     className={`inline-block h-5 w-5 transform rounded-full transition-all duration-300 ease-in-out shadow-md ${
                       enableCustomDateTime 
                         ? 'translate-x-8 !bg-white !shadow-lg' 
                         : 'translate-x-1 !bg-gray-200'
                     }`}
                   />
                 </button>
                 <span className="ml-3 text-sm font-semibold text-white">
                   {enableCustomDateTime ? 'Aktif' : 'Nonaktif'}
                 </span>
               </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {enableCustomDateTime 
                ? 'Tanggal dan waktu kustom diaktifkan. Pesanan akan menggunakan waktu yang dipilih.'
                : 'Menggunakan waktu saat ini untuk pesanan.'
              }
            </p>
          </div>
          
          {enableCustomDateTime && (
            <>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Tanggal Pesanan</label>
                <div className="relative">
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => {
                      setOrderDate(e.target.value);
                    }}
                    className="w-full p-4 rounded-xl border bg-white text-[#1E3C30] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none'
                    }}
                    placeholder="YYYY-MM-DD"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Klik untuk memilih tanggal atau ketik format YYYY-MM-DD</p>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Waktu Pesanan</label>
                <div className="relative">
                  <input
                    type="time"
                    value={orderTime}
                    onChange={(e) => {
                      setOrderTime(e.target.value);
                    }}
                    className="w-full p-4 rounded-xl border bg-white text-[#1E3C30] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Klik untuk memilih waktu atau ketik format HH:MM</p>
              </div>
            </>
          )}
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
                          onClick={() => openPaymentModal(tx.id)}
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
                        }} isOpen={modalIsOpen} onRequestClose={closePaymentModal}>
                          <h2 className="text-lg font-semibold text-[#1E3C30]">Konfirmasi Pembayaran</h2>
                          <p className="text-sm text-[#1E3C30] mb-4">Pilih metode pembayaran:</p>
                          <div className="flex flex-col gap-3">
                            <button 
                              className="!bg-green-500 !text-white !px-3 !py-2 !rounded-lg hover:!bg-green-600"
                              onClick={() => selectedTransactionId && handleCompletePayment(selectedTransactionId, 'cash')}
                            >
                              Bayar Cash
                            </button>
                            <button 
                              className="!bg-blue-500 !text-white !px-3 !py-2 !rounded-lg hover:!bg-blue-600"
                              onClick={() => selectedTransactionId && handleCompletePayment(selectedTransactionId, 'qris')}
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
