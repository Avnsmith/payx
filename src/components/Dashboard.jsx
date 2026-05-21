import React, { useState, useEffect } from 'react';
import { 
  LogOut, Send, QrCode, Wallet, Users, FileText, Sparkles, Gift, 
  Calendar, Plus, RefreshCw, Copy, Check, ExternalLink, ArrowRight, 
  Trash2, Clock, Coins, CheckCircle2, ChevronRight, AlertCircle, Eye
} from 'lucide-react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import SendModal from './SendModal';
import ReceiveModal from './ReceiveModal';

const DEFAULT_APP_ID = "ff030750-f8da-5838-885a-c8b46b4cbad0";

const Dashboard = ({ wallet, balance, setBalance, onLogout, onNavigate, fetchBalance }) => {
  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet', 'invoices', 'claims', 'payroll', 'payouts'
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Clipboard copied indicators
  const [copiedText, setCopiedText] = useState({});

  // Faucet address copy
  const [copiedFriendIdx, setCopiedFriendIdx] = useState(null);

  // --- Module states ---
  // 1. Invoices
  const [invoices, setInvoices] = useState([]);
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceRecipientEmail, setInvoiceRecipientEmail] = useState('');
  const [invoiceRecipientAddress, setInvoiceRecipientAddress] = useState(wallet.address);
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [parsingAi, setParsingAi] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // 2. Claims
  const [claims, setClaims] = useState([]);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimMessage, setClaimMessage] = useState('');
  const [sendingClaim, setSendingClaim] = useState(false);
  const [latestClaimLink, setLatestClaimLink] = useState('');

  // 3. Payroll
  const [payrollBatches, setPayrollBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchItems, setBatchItems] = useState([]);
  const [batchTitle, setBatchTitle] = useState('');
  const [batchPayDate, setBatchPayDate] = useState('');
  const [batchFrequency, setBatchFrequency] = useState('once');
  const [employees, setEmployees] = useState([
    { employee_name: '', employee_email: '', wallet: '', base_salary: '', allowance: '0', bonus: '0', deduction: '0' }
  ]);
  const [creatingPayroll, setCreatingPayroll] = useState(false);
  const [executingPayroll, setExecutingPayroll] = useState(false);

  // 4. Payouts
  const [payouts, setPayouts] = useState([]);
  const [payoutRecipient, setPayoutRecipient] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMode, setPayoutMode] = useState('now'); // 'now', 'scheduled'
  const [payoutFrequency, setPayoutFrequency] = useState('once');
  const [creatingPayout, setCreatingPayout] = useState(false);
  const [executingPayoutId, setExecutingPayoutId] = useState(null);

  // --- Mock Friend List ---
  const [friends] = useState([
    { name: 'Vinh (Merchant)', address: '0xa59615ffe6cabcdcbcff586c75efd12d2f7dd9f6' },
    { name: 'Alice (Developer)', address: '0x71C25ff77636976F2F590f6F6f9d24029b3c976F' },
    { name: 'Bob (Designer)', address: '0x39A72288D1b46bC36C38865888d3e206abA188D1' }
  ]);

  // Fetch all module data
  const loadInvoices = async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (res.ok && data.ok) {
        setInvoices(data.invoices);
      }
    } catch (e) { console.error("Error loading invoices:", e); }
  };

  const loadPayroll = async () => {
    try {
      const res = await fetch('/api/payroll-batches');
      const data = await res.json();
      if (res.ok) {
        setPayrollBatches(data);
      }
    } catch (e) { console.error("Error loading payroll:", e); }
  };

  const loadPayouts = async () => {
    try {
      const res = await fetch('/api/payouts');
      const data = await res.json();
      if (res.ok) {
        setPayouts(data);
      }
    } catch (e) { console.error("Error loading payouts:", e); }
  };

  const loadClaims = async () => {
    // There is no explicit list-all claims endpoint in server.js but let's grab database entries 
    // using a custom fetch or fall back to local/in-memory if not available.
    // For now we'll fetch details or mock list since db has it.
    // Wait, let's look at server.cjs: it doesn't have an explicit GET /api/claims,
    // but we can query it easily if we want. Let's see if we should fetch.
  };

  useEffect(() => {
    loadInvoices();
    loadPayroll();
    loadPayouts();
  }, []);

  const triggerCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedText(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // --- 1. Circle Wallet Transfer Trigger ---
  const handleSend = async (to, amount) => {
    let targetAddress = to.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      alert('Please enter a valid 0x address.');
      return false;
    }

    const activeAppId = wallet.customAppId || localStorage.getItem("payx_custom_app_id") || DEFAULT_APP_ID;
    const activeApiKey = wallet.customApiKey || localStorage.getItem("payx_custom_api_key");

    setSending(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (activeApiKey) {
        headers['x-circle-api-key'] = activeApiKey;
      }

      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'createTransfer',
          userToken: wallet.userToken,
          walletId: wallet.walletId,
          destinationAddress: targetAddress,
          amount: amount.toString()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to create transfer challenge");

      const challengeId = data.challengeId;

      const sdk = new W3SSdk({
        appSettings: { appId: activeAppId }
      });

      sdk.setAuthentication({
        userToken: wallet.userToken,
        encryptionKey: wallet.encryptionKey
      });

      return new Promise((resolve) => {
        sdk.execute(challengeId, (error) => {
          setSending(false);
          if (error) {
            console.error("Execute transfer failed:", error);
            alert("Transfer failed: " + error.message);
            resolve(false);
            return;
          }

          alert("Transfer completed successfully! 🎉");
          setTimeout(() => {
            fetchBalance();
          }, 3000);
          resolve(true);
        });
      });
    } catch (err) {
      console.error(err);
      alert("Send failed: " + err.message);
      setSending(false);
      return false;
    }
  };

  // --- 2. Invoices Actions ---
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceTitle || !invoiceAmount || !invoiceRecipientAddress) return;

    setCreatingInvoice(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: invoiceTitle,
          amount: Number(invoiceAmount),
          recipientAddress: invoiceRecipientAddress,
          recipientEmail: invoiceRecipientEmail,
          dueDate: invoiceDueDate,
          note: invoiceNote
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("Invoice created successfully! 📄");
        setInvoiceTitle('');
        setInvoiceAmount('');
        setInvoiceRecipientEmail('');
        setInvoiceDueDate('');
        setInvoiceNote('');
        loadInvoices();
      } else {
        throw new Error(data.error || "Failed to create invoice");
      }
    } catch (err) {
      alert("Create invoice failed: " + err.message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleAiParse = async () => {
    if (!aiPrompt) return;
    setParsingAi(true);
    try {
      const res = await fetch('/api/ai/invoice-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoiceTitle(data.draft.title || '');
        setInvoiceAmount(data.draft.amount || '');
        setInvoiceNote(data.draft.description || '');
        if (data.draft.customer) {
          setInvoiceRecipientEmail(data.draft.customer.toLowerCase().includes('@') ? data.draft.customer : '');
        }
        alert("✨ AI extracted fields successfully!");
        setAiPrompt('');
      } else {
        throw new Error(data.error || "AI parser returned invalid data");
      }
    } catch (err) {
      alert("AI Parsing failed: " + err.message);
    } finally {
      setParsingAi(false);
    }
  };

  const checkInvoicePayment = async (invId) => {
    try {
      const res = await fetch(`/api/invoices/${invId}/check-payment`);
      const data = await res.json();
      if (res.ok) {
        alert(data.status === 'PAID' ? "Confirmed! Invoice is fully PAID on-chain. 🎉" : "Invoice is still PENDING on-chain.");
        loadInvoices();
      }
    } catch (err) {
      alert("Check payment failed: " + err.message);
    }
  };

  // --- 3. Claims Actions ---
  const handleSendClaim = async (e) => {
    e.preventDefault();
    if (!claimEmail || !claimAmount) return;

    setSendingClaim(true);
    setLatestClaimLink('');

    try {
      const res = await fetch('/api/claims/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: claimEmail,
          amount: Number(claimAmount),
          message: claimMessage
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Claim Link generated and sent successfully! 📧");
        setLatestClaimLink(data.claimLink);
        setClaimEmail('');
        setClaimAmount('');
        setClaimMessage('');
      } else {
        throw new Error(data.error || "Failed to create claim");
      }
    } catch (err) {
      alert("Create claim failed: " + err.message);
    } finally {
      setSendingClaim(false);
    }
  };

  // --- 4. Payroll Actions ---
  const addEmployeeRow = () => {
    setEmployees([
      ...employees,
      { employee_name: '', employee_email: '', wallet: '', base_salary: '', allowance: '0', bonus: '0', deduction: '0' }
    ]);
  };

  const removeEmployeeRow = (index) => {
    if (employees.length === 1) return;
    setEmployees(employees.filter((_, idx) => idx !== index));
  };

  const handleEmployeeChange = (index, field, value) => {
    const updated = [...employees];
    updated[index][field] = value;
    setEmployees(updated);
  };

  const handleCreatePayroll = async (e) => {
    e.preventDefault();
    if (!batchTitle || employees.some(emp => !emp.employee_name || !emp.employee_email || !emp.wallet || !emp.base_salary)) {
      alert("Please fill in batch details and all employee rows.");
      return;
    }

    setCreatingPayroll(true);

    try {
      const res = await fetch('/api/payroll-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: batchTitle,
          pay_date: batchPayDate || new Date().toISOString(),
          frequency: batchFrequency,
          employees: employees.map(emp => ({
            employee_name: emp.employee_name,
            employee_email: emp.employee_email,
            wallet: emp.wallet,
            base_salary: Number(emp.base_salary),
            allowance: Number(emp.allowance),
            bonus: Number(emp.bonus),
            deduction: Number(emp.deduction)
          }))
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Payroll Batch drafted successfully! 💼");
        setBatchTitle('');
        setBatchPayDate('');
        setBatchFrequency('once');
        setEmployees([{ employee_name: '', employee_email: '', wallet: '', base_salary: '', allowance: '0', bonus: '0', deduction: '0' }]);
        loadPayroll();
      } else {
        throw new Error(data.error || "Failed to create payroll");
      }
    } catch (err) {
      alert("Create payroll batch failed: " + err.message);
    } finally {
      setCreatingPayroll(false);
    }
  };

  const selectPayrollBatch = async (batch) => {
    setSelectedBatch(batch);
    try {
      const res = await fetch(`/api/payroll-batches/${batch.id}/items`);
      const data = await res.json();
      if (res.ok) {
        setBatchItems(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprovePayroll = async (batchId) => {
    try {
      const res = await fetch(`/api/payroll-batches/${batchId}/approve`, { method: 'POST' });
      if (res.ok) {
        alert("Payroll batch approved successfully! 💼");
        loadPayroll();
        if (selectedBatch && selectedBatch.id === batchId) {
          selectPayrollBatch({ ...selectedBatch, status: 'APPROVED' });
        }
      }
    } catch (err) {
      alert("Approval failed: " + err.message);
    }
  };

  const handleExecutePayroll = async (batchId) => {
    setExecutingPayroll(true);
    try {
      const res = await fetch(`/api/payroll-batches/${batchId}/execute`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Payroll batch fully disbursed on-chain and employee payslips sent via email! 🚀🎉");
        loadPayroll();
        if (selectedBatch && selectedBatch.id === batchId) {
          selectPayrollBatch({ ...selectedBatch, status: 'PAID' });
        }
      } else {
        throw new Error(data.error || "Execution failed");
      }
    } catch (err) {
      alert("Disbursement failed: " + err.message);
    } finally {
      setExecutingPayroll(false);
    }
  };

  // --- 5. Payouts Actions ---
  const handleCreatePayout = async (e) => {
    e.preventDefault();
    if (!payoutRecipient || !payoutAmount) return;

    setCreatingPayout(true);
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: payoutRecipient,
          amount: Number(payoutAmount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Payout created successfully! 💸");
        setPayoutRecipient('');
        setPayoutAmount('');
        loadPayouts();
      }
    } catch (err) {
      alert("Failed to draft payout: " + err.message);
    } finally {
      setCreatingPayout(false);
    }
  };

  const executePayout = async (payoutId) => {
    setExecutingPayoutId(payoutId);
    try {
      const res = await fetch(`/api/payouts/${payoutId}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Payout processed on-chain! 🎉");
        loadPayouts();
      } else {
        throw new Error(data.error || "Payout processing failed");
      }
    } catch (err) {
      alert("Execution failed: " + err.message);
    } finally {
      setExecutingPayoutId(null);
    }
  };

  return (
    <div className="main-card glass-panel" style={{ maxWidth: '1080px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
      
      {/* Header section */}
      <div className="app-header" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('wallet')}>
          <Wallet size={28} className="text-accent" />
          <span>PayX Portal</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="text-xs text-muted font-semibold px-3 py-1 bg-white/5 border border-white/5 rounded-full">
            {wallet.email}
          </span>
          <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => onNavigate('faucet')} title="Faucet">
            Faucet
          </button>
          <button className="btn-secondary" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }} onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem', minHeight: '520px' }}>
        
        {/* Navigation Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '1rem' }}>
          <button 
            className={`btn-secondary ${activeTab === 'wallet' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('wallet')}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'wallet' ? '1px solid var(--accent)' : '1px solid transparent' }}
          >
            <Wallet size={18} /> Overview & Wallet
          </button>
          
          <button 
            className={`btn-secondary ${activeTab === 'invoices' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('invoices')}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'invoices' ? '1px solid var(--accent)' : '1px solid transparent' }}
          >
            <FileText size={18} /> Invoice Hub
          </button>

          <button 
            className={`btn-secondary ${activeTab === 'claims' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('claims')}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'claims' ? '1px solid var(--accent)' : '1px solid transparent' }}
          >
            <Gift size={18} /> Claim Links
          </button>

          <button 
            className={`btn-secondary ${activeTab === 'payroll' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('payroll')}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'payroll' ? '1px solid var(--accent)' : '1px solid transparent' }}
          >
            <Users size={18} /> Corporate Payroll
          </button>

          <button 
            className={`btn-secondary ${activeTab === 'payouts' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('payouts')}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'payouts' ? '1px solid var(--accent)' : '1px solid transparent' }}
          >
            <Coins size={18} /> Payouts & Scheduled
          </button>
        </div>

        {/* Tab Detail View */}
        <div style={{ overflowY: 'auto', maxHeight: '680px', paddingRight: '0.5rem' }}>
          
          {/* TAB 1: OVERVIEW & WALLET */}
          {activeTab === 'wallet' && (
            <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="balance-card animate-pulse-subtle" style={{ margin: 0, background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                <div className="text-muted font-semibold text-xs uppercase" style={{ trackingSpacing: '0.05em' }}>Circle Smart Wallet Balance</div>
                <div className="balance-amount">
                  <span className="balance-currency">USDC</span>
                  {balance}
                </div>
                <div className="text-xs text-muted font-mono" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>SCA • {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</span>
                  <button onClick={() => triggerCopy(wallet.address, 'w_addr')} className="text-accent" style={{ padding: 0 }}>
                    {copiedText['w_addr'] ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="action-buttons" style={{ margin: 0 }}>
                <button className="btn-primary" onClick={() => setShowSendModal(true)} disabled={sending}>
                  {sending ? 'Processing...' : <><Send size={18} /> Direct Send</>}
                </button>
                <button className="btn-secondary" onClick={() => setShowReceiveModal(true)} disabled={sending}>
                  <QrCode size={18} /> Show QR Code
                </button>
              </div>

              <div>
                <div className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} className="text-muted" />
                  <h3 className="font-semibold text-sm">Quick Send Directory</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {friends.map((friend, i) => (
                    <div key={i} className="friend-item" style={{ padding: '0.75rem 1rem' }} onClick={() => {
                      setShowSendModal(true);
                    }}>
                      <div className="friend-avatar" style={{ width: '32px', height: '32px', fontSize: '0.875rem' }}>
                        {friend.name.charAt(0)}
                      </div>
                      <div className="friend-info">
                        <div className="friend-name" style={{ fontSize: '0.875rem' }}>{friend.name}</div>
                        <div className="friend-address" style={{ fontSize: '11px' }}>{friend.address.slice(0,6)}...{friend.address.slice(-4)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICES HUB */}
          {activeTab === 'invoices' && (
            <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                
                {/* Invoice Form Column */}
                <div>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-accent" /> Create Commercial Invoice
                  </h3>
                  
                  {/* AI Extractor Widget */}
                  <div className="p-4 bg-accent/5 border border-accent/15 rounded-2xl mb-5 text-left">
                    <h4 className="font-bold text-xs text-accent flex items-center gap-2 mb-2">
                      <Sparkles size={14} /> AI Invoice Generator (GPT-4o Mini)
                    </h4>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="input-field" 
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', margin: 0 }}
                        placeholder="Draft invoice for $150 USDC to Google due next Friday..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={parsingAi}
                      />
                      <button 
                        onClick={handleAiParse}
                        className="btn-primary" 
                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        disabled={parsingAi || !aiPrompt}
                      >
                        {parsingAi ? 'Parsing...' : 'Draft'}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label text-xs">Invoice Title / Work Description</label>
                        <input 
                          type="text" 
                          className="input-field"
                          placeholder="Web Design Services"
                          value={invoiceTitle}
                          onChange={(e) => setInvoiceTitle(e.target.value)}
                          required
                          disabled={creatingInvoice}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label text-xs">USDC Amount</label>
                        <input 
                          type="number" 
                          className="input-field"
                          placeholder="250"
                          value={invoiceAmount}
                          onChange={(e) => setInvoiceAmount(e.target.value)}
                          required
                          disabled={creatingInvoice}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label text-xs">Recipient Client Email (for invoice link notification)</label>
                        <input 
                          type="email" 
                          className="input-field"
                          placeholder="client@acme.com"
                          value={invoiceRecipientEmail}
                          onChange={(e) => setInvoiceRecipientEmail(e.target.value)}
                          disabled={creatingInvoice}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label text-xs">Recipient Wallet Address (defaults to yours)</label>
                        <input 
                          type="text" 
                          className="input-field font-mono"
                          placeholder="0x..."
                          value={invoiceRecipientAddress}
                          onChange={(e) => setInvoiceRecipientAddress(e.target.value)}
                          required
                          disabled={creatingInvoice}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label text-xs">Due Date</label>
                        <input 
                          type="date" 
                          className="input-field"
                          value={invoiceDueDate}
                          onChange={(e) => setInvoiceDueDate(e.target.value)}
                          disabled={creatingInvoice}
                        />
                      </div>
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label text-xs">Optional Memo / Note</label>
                      <textarea 
                        className="input-field"
                        style={{ height: '70px', resize: 'none' }}
                        placeholder="Please pay by next Friday. Thanks for your business!"
                        value={invoiceNote}
                        onChange={(e) => setInvoiceNote(e.target.value)}
                        disabled={creatingInvoice}
                      />
                    </div>

                    <button type="submit" className="btn-primary" disabled={creatingInvoice}>
                      {creatingInvoice ? 'Creating Invoice...' : 'Generate Commercial Invoice'}
                    </button>
                  </form>
                </div>

                {/* Invoice List Column */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="font-bold">Historical Invoices</h3>
                    <button onClick={loadInvoices} className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                      <RefreshCw size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto' }}>
                    {invoices.length === 0 ? (
                      <div className="text-center py-8 text-muted text-xs">No invoices created yet.</div>
                    ) : (
                      invoices.map((inv) => {
                        const checkoutUrl = window.location.origin + inv.checkoutUrl;
                        return (
                          <div key={inv.id} className="p-3 bg-white/5 rounded-xl border border-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span className="font-bold text-white text-sm block truncate max-w-[150px]">{inv.title}</span>
                                <span className="text-xs text-muted font-mono">{inv.id}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                                inv.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                              }`}>
                                {inv.status}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="font-bold text-white text-md">{inv.amount} USDC</span>
                              {inv.dueDate && (
                                <span className="text-[10px] text-muted">Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                              )}
                            </div>

                            <div className="border-t border-white/5 pt-2 flex justify-between gap-1">
                              <button 
                                onClick={() => triggerCopy(checkoutUrl, inv.id)} 
                                className="btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '10px', flex: 1 }}
                              >
                                {copiedText[inv.id] ? 'Copied Link' : 'Copy Link'}
                              </button>

                              {inv.status !== 'PAID' ? (
                                <button 
                                  onClick={() => checkInvoicePayment(inv.id)} 
                                  className="btn-primary" 
                                  style={{ padding: '4px 8px', fontSize: '10px', flex: 1 }}
                                >
                                  Check Payment
                                </button>
                              ) : (
                                inv.txHash && inv.txHash.startsWith('0x') && (
                                  <a 
                                    href={`https://testnet.arcscan.app/tx/${inv.txHash}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn-secondary text-decoration-none" 
                                    style={{ padding: '4px 8px', fontSize: '10px', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                  >
                                    Explorer
                                  </a>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: CLAIM LINKS */}
          {activeTab === 'claims' && (
            <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                
                {/* Claim Generator Form */}
                <div>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Gift size={18} className="text-accent" /> Generate USDC Claim Links
                  </h3>
                  <p className="text-xs text-muted mb-4">
                    Send USDC directly to anyone's email address. The recipient gets a secure claim link, enters their wallet, and funds are disbursed automatically using the on-chain payout wallet!
                  </p>

                  <form onSubmit={handleSendClaim} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label text-xs">Recipient Email</label>
                      <input 
                        type="email" 
                        className="input-field"
                        placeholder="employee@contractor.com"
                        value={claimEmail}
                        onChange={(e) => setClaimEmail(e.target.value)}
                        required
                        disabled={sendingClaim}
                      />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label text-xs">USDC Amount to Disburse</label>
                      <input 
                        type="number" 
                        className="input-field"
                        placeholder="100"
                        value={claimAmount}
                        onChange={(e) => setClaimAmount(e.target.value)}
                        required
                        disabled={sendingClaim}
                      />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label text-xs">Custom Email Message</label>
                      <textarea 
                        className="input-field"
                        style={{ height: '80px', resize: 'none' }}
                        placeholder="Here is your payment for last week's contract tasks. Click link to withdraw!"
                        value={claimMessage}
                        onChange={(e) => setClaimMessage(e.target.value)}
                        disabled={sendingClaim}
                      />
                    </div>

                    <button type="submit" className="btn-primary" disabled={sendingClaim}>
                      {sendingClaim ? 'Generating Link & Emailing...' : 'Email Claim Link'}
                    </button>
                  </form>

                  {latestClaimLink && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl mt-5">
                      <span className="font-bold text-emerald-400 text-xs block mb-1">✅ Link Generated Successfully!</span>
                      <p className="text-xs text-muted mb-3">If Resend email settings are sandbox-only, you can copy and send this link manually:</p>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="input-field font-mono"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', margin: 0 }}
                          value={latestClaimLink}
                          readOnly
                        />
                        <button 
                          onClick={() => triggerCopy(latestClaimLink, 'latest_c')} 
                          className="btn-primary" 
                          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                          {copiedText['latest_c'] ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Claim link explainer card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                    <h4 className="font-bold text-sm text-white mb-2">How Claim Links Work</h4>
                    <ol className="text-xs text-muted" style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <li>You deposit/define USDC to send to an email address.</li>
                      <li>The system sends a premium notification email to the recipient containing their unique claim link.</li>
                      <li>The claimant opens the link (no app download required), enters their preferred ERC20 address (Sepolia Testnet), and hits Claim.</li>
                      <li>Our secure payout backend completes the transaction and sends the USDC directly on-chain.</li>
                    </ol>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: CORPORATE PAYROLL */}
          {activeTab === 'payroll' && (
            <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Batch list or active batch details */}
              {selectedBatch ? (
                <div>
                  <div className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setSelectedBatch(null)}>
                      ← Back to Batches
                    </button>
                    <h3 className="font-bold text-lg">{selectedBatch.title}</h3>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl mb-5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="text-xs text-muted block">STATUS</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        selectedBatch.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                        selectedBatch.status === 'APPROVED' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {selectedBatch.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">TOTAL PAYOUT</span>
                      <span className="font-bold text-white text-md">{selectedBatch.total_amount} USDC</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">EMPLOYEES</span>
                      <span className="font-bold text-white text-md">{selectedBatch.employee_count}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {selectedBatch.status === 'DRAFT' && (
                        <button onClick={() => handleApprovePayroll(selectedBatch.id)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                          Approve Batch
                        </button>
                      )}
                      {(selectedBatch.status === 'APPROVED' || selectedBatch.status === 'REVIEW') && (
                        <button 
                          onClick={() => handleExecutePayroll(selectedBatch.id)} 
                          className="btn-primary" 
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                          disabled={executingPayroll}
                        >
                          {executingPayroll ? 'Disbursing...' : 'Disburse Payroll On-Chain'}
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-sm mb-3">Employee Salary Breakdown</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {batchItems.map((item) => (
                      <div key={item.id} className="p-3 bg-white/5 border border-white/5 rounded-xl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span className="font-bold text-white text-sm block">{item.employee_name}</span>
                          <span className="text-xs text-muted block">{item.employee_email}</span>
                          <span className="text-[10px] text-muted font-mono">{item.wallet.slice(0,10)}...{item.wallet.slice(-8)}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="font-bold text-white block text-sm">{item.final_amount} USDC</span>
                          <span className="text-xs text-muted block">Base: {item.base_salary} | Bonus: {item.bonus} | Ded: {item.deduction}</span>
                          {item.tx_hash && (
                            <a 
                              href={`https://testnet.arcscan.app/tx/${item.tx_hash}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[10px] text-accent flex items-center gap-1 mt-1 justify-end text-decoration-none"
                            >
                              View tx <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                  
                  {/* Payroll Draft Form */}
                  <div>
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <Plus size={18} className="text-accent" /> Draft New Payroll Batch
                    </h3>

                    <form onSubmit={handleCreatePayroll} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label text-xs">Payroll Batch Title</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="June 2026 Monthly Salaries"
                          value={batchTitle}
                          onChange={(e) => setBatchTitle(e.target.value)}
                          required
                          disabled={creatingPayroll}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group" style={{ margin: 0 }}>
                          <label className="input-label text-xs">Pay Date</label>
                          <input 
                            type="date" 
                            className="input-field"
                            value={batchPayDate}
                            onChange={(e) => setBatchPayDate(e.target.value)}
                            disabled={creatingPayroll}
                          />
                        </div>
                        <div className="input-group" style={{ margin: 0 }}>
                          <label className="input-label text-xs">Frequency</label>
                          <select 
                            className="input-field"
                            value={batchFrequency}
                            onChange={(e) => setBatchFrequency(e.target.value)}
                            disabled={creatingPayroll}
                          >
                            <option value="once">Once</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                        <h4 className="font-bold text-xs text-white">Employees list</h4>
                        <button type="button" onClick={addEmployeeRow} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '11px' }}>
                          + Add Employee
                        </button>
                      </div>

                      {/* Employee item inputs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                        {employees.map((emp, index) => (
                          <div key={index} className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-2 relative">
                            {employees.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeEmployeeRow(index)} 
                                style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--danger)', padding: 0 }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                              <input 
                                type="text" 
                                className="input-field" 
                                style={{ padding: '0.5rem', fontSize: '12px' }}
                                placeholder="Name (e.g. Mai)"
                                value={emp.employee_name}
                                onChange={(e) => handleEmployeeChange(index, 'employee_name', e.target.value)}
                                required
                              />
                              <input 
                                type="email" 
                                className="input-field" 
                                style={{ padding: '0.5rem', fontSize: '12px' }}
                                placeholder="Email"
                                value={emp.employee_email}
                                onChange={(e) => handleEmployeeChange(index, 'employee_email', e.target.value)}
                                required
                              />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '0.5rem' }}>
                              <input 
                                type="text" 
                                className="input-field font-mono" 
                                style={{ padding: '0.5rem', fontSize: '12px' }}
                                placeholder="Wallet Address (0x...)"
                                value={emp.wallet}
                                onChange={(e) => handleEmployeeChange(index, 'wallet', e.target.value)}
                                required
                              />
                              <input 
                                type="number" 
                                className="input-field" 
                                style={{ padding: '0.5rem', fontSize: '12px' }}
                                placeholder="Base (USDC)"
                                value={emp.base_salary}
                                onChange={(e) => handleEmployeeChange(index, 'base_salary', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <button type="submit" className="btn-primary" disabled={creatingPayroll}>
                        {creatingPayroll ? 'Drafting Batch...' : 'Draft Payroll Batch'}
                      </button>
                    </form>
                  </div>

                  {/* Payroll batches list */}
                  <div>
                    <h3 className="font-bold mb-4">Historical Payroll Batches</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {payrollBatches.length === 0 ? (
                        <div className="text-center py-8 text-muted text-xs">No payroll batches drafted yet.</div>
                      ) : (
                        payrollBatches.map((batch) => (
                          <div 
                            key={batch.id} 
                            onClick={() => selectPayrollBatch(batch)}
                            className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-accent/40 cursor-pointer" 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'var(--transition)' }}
                          >
                            <div>
                              <span className="font-bold text-white text-sm block">{batch.title}</span>
                              <span className="text-[10px] text-muted block">Created: {new Date(batch.created_at).toLocaleDateString()}</span>
                              <span className="text-[10px] text-muted block">{batch.employee_count} employees • {batch.total_amount} USDC</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                batch.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                                batch.status === 'APPROVED' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                              }`}>
                                {batch.status}
                              </span>
                              <ChevronRight size={14} className="text-muted" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
              
            </div>
          )}

          {/* TAB 5: QUICK & SCHEDULED PAYOUTS */}
          {activeTab === 'payouts' && (
            <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                
                {/* Payout draft form */}
                <div>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-accent" /> Create Quick / Scheduled Payout
                  </h3>
                  
                  <form onSubmit={handleCreatePayout} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label text-xs">Recipient Address</label>
                      <input 
                        type="text" 
                        className="input-field font-mono"
                        placeholder="0x..."
                        value={payoutRecipient}
                        onChange={(e) => setPayoutRecipient(e.target.value)}
                        required
                        disabled={creatingPayout}
                      />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label text-xs">USDC Amount</label>
                      <input 
                        type="number" 
                        className="input-field"
                        placeholder="50"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        required
                        disabled={creatingPayout}
                      />
                    </div>

                    <button type="submit" className="btn-primary" disabled={creatingPayout}>
                      {creatingPayout ? 'Drafting...' : 'Draft Payout'}
                    </button>
                  </form>
                </div>

                {/* Payout history / approval */}
                <div>
                  <h3 className="font-bold mb-4">Payouts queue</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {payouts.length === 0 ? (
                      <div className="text-center py-8 text-muted text-xs">No payouts drafted.</div>
                    ) : (
                      payouts.map((p) => (
                        <div key={p.id} className="p-3 bg-white/5 border border-white/5 rounded-xl" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span className="text-xs text-muted font-mono block truncate max-w-[120px]">{p.recipient}</span>
                              <span className="font-bold text-white text-sm">{p.amount} USDC</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                              p.status === 'APPROVED' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {p.status}
                            </span>
                          </div>

                          {(p.status === 'PENDING' || p.status === 'REVIEW') && (
                            <button 
                              onClick={() => executePayout(p.id)} 
                              className="btn-primary w-full" 
                              style={{ padding: '4px 8px', fontSize: '10px' }}
                              disabled={executingPayoutId === p.id}
                            >
                              {executingPayoutId === p.id ? 'Confirming...' : 'Confirm & Execute on-chain'}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {showSendModal && (
        <SendModal 
          onClose={() => setShowSendModal(false)} 
          onSend={handleSend}
          friends={friends}
        />
      )}
      
      {showReceiveModal && (
        <ReceiveModal 
          onClose={() => setShowReceiveModal(false)}
          address={wallet.address}
        />
      )}
    </div>
  );
};

export default Dashboard;
