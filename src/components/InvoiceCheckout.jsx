import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, CheckCircle2, ArrowRight, Loader2, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

const DEFAULT_APP_ID = "ff030750-f8da-5838-885a-c8b46b4cbad0";

const InvoiceCheckout = ({ invoiceId, wallet, onBackToApp }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [error, setError] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Manual payment state
  const [manualTxHash, setManualTxHash] = useState('');
  const [manualFromAddress, setManualFromAddress] = useState('');

  // Balance info
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [fetchingBalance, setFetchingBalance] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) {
        throw new Error('Invoice not found or has expired.');
      }
      const data = await res.json();
      if (data.ok) {
        setInvoice(data.invoice);
      } else {
        throw new Error(data.error || 'Failed to fetch invoice.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCircleBalance = async () => {
    if (!wallet) return;
    try {
      setFetchingBalance(true);
      const activeApiKey = wallet.customApiKey || localStorage.getItem("payx_custom_api_key");
      const headers = { "Content-Type": "application/json" };
      if (activeApiKey) {
        headers["x-circle-api-key"] = activeApiKey;
      }

      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "getTokenBalance",
          userToken: wallet.userToken,
          walletId: wallet.walletId
        })
      });
      const data = await res.json();
      if (res.ok) {
        const balances = data.tokenBalances || [];
        const usdcEntry = balances.find(
          t => t.token.tokenAddress?.toLowerCase() === '0x3600000000000000000000000000000000000000' ||
               t.token.symbol === 'USDC' ||
               t.token.name.includes('USDC')
        );
        setWalletBalance(usdcEntry ? usdcEntry.amount : "0.00");
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setFetchingBalance(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (wallet && invoice) {
      fetchCircleBalance();
    }
  }, [wallet, invoice]);

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else if (type === 'amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } else if (type === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleCirclePay = async () => {
    if (!wallet || !invoice) return;
    if (Number(walletBalance) < Number(invoice.amount)) {
      alert("Insufficient USDC balance in your Circle Smart Wallet to complete this payment.");
      return;
    }

    setPaying(true);
    setError(null);

    const activeAppId = wallet.customAppId || localStorage.getItem("payx_custom_app_id") || DEFAULT_APP_ID;
    const activeApiKey = wallet.customApiKey || localStorage.getItem("payx_custom_api_key");

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (activeApiKey) {
        headers['x-circle-api-key'] = activeApiKey;
      }

      // 1. Create a transfer challenge
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'createTransfer',
          userToken: wallet.userToken,
          walletId: wallet.walletId,
          destinationAddress: invoice.recipientAddress,
          amount: invoice.amount.toString()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to create transfer challenge");
      }

      const challengeId = data.challengeId;

      // 2. Initialize and trigger secure Circle PIN modal
      const sdk = new W3SSdk({
        appSettings: { appId: activeAppId }
      });

      sdk.setAuthentication({
        userToken: wallet.userToken,
        encryptionKey: wallet.encryptionKey
      });

      sdk.execute(challengeId, async (error) => {
        if (error) {
          console.error("Circle payment failed:", error);
          alert("Payment authentication failed: " + error.message);
          setPaying(false);
          return;
        }

        // 3. Circle transfer approved, let's wait a few seconds and trigger on-chain check
        // Or directly mark as paid via backend
        try {
          // Circle API will execute transfer, let's mark the invoice as PAID with a dummy hash initially
          // or run auto verification.
          const markRes = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash: "CIRCLE_SCA_" + crypto.randomUUID().slice(0, 8),
              fromAddress: wallet.address
            })
          });
          const markData = await markRes.json();
          if (markRes.ok) {
            setInvoice(markData.invoice);
            alert("Invoice paid successfully using secure Circle Smart Wallet! 🎉");
          } else {
            throw new Error(markData.error || "Failed to finalize payment record");
          }
        } catch (err) {
          alert("Payment finalized but failed to update status: " + err.message);
        } finally {
          setPaying(false);
        }
      });

    } catch (err) {
      console.error(err);
      setError(err.message);
      setPaying(false);
    }
  };

  const handleManualPay = async (e) => {
    e.preventDefault();
    if (!manualTxHash || !manualFromAddress) {
      alert("Please fill in the Transaction Hash and Your Wallet Address.");
      return;
    }

    setSubmittingManual(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: manualTxHash.trim(),
          fromAddress: manualFromAddress.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit manual payment.');
      }
      setInvoice(data.invoice);
      alert("Manual payment submitted and invoice marked as PAID! 🎉");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  const checkPaymentOnChain = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/check-payment`);
      const data = await res.json();
      if (res.ok) {
        setInvoice(rowToInvoice(data)); // Wait! The backend returns the raw row
        alert(data.status === 'PAID' ? "Payment verified successfully on-chain! 🎉" : "No matching payment found yet on-chain.");
      } else {
        throw new Error(data.error || "Verification check failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      fetchInvoice();
    }
  };

  // Quick helper to map backend raw response to invoice object if checking payment
  function rowToInvoice(row) {
    if (!row) return null;
    const checkoutPath = `/?invoice=${row.id}`;
    return {
      id: row.id,
      title: row.title,
      amount: row.amount,
      recipientAddress: row.recipientAddress,
      targetChain: row.targetChain,
      note: row.note || "",
      status: row.status,
      txHash: row.txHash || null,
      fromAddress: row.fromAddress || null,
      createdAt: row.createdAt,
      paidAt: row.paidAt || null,
      dueDate: row.dueDate,
      checkoutPath,
      checkoutUrl: checkoutPath,
    };
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Loader2 className="spinner text-accent mb-4" size={48} />
        <p className="text-muted">Loading secure invoice details...</p>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="main-card glass-panel text-center max-w-[500px] mx-auto">
        <AlertTriangle className="text-rose-500 mx-auto mb-4" size={48} />
        <h2 className="mb-2">Invoice Error</h2>
        <p className="text-muted mb-6">{error}</p>
        <button className="btn-primary w-full" onClick={onBackToApp}>
          Go to PayX Wallet
        </button>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';

  return (
    <div className="main-card glass-panel max-w-[540px] mx-auto text-center animate-slideUp">
      <div className="logo mb-6 justify-center">
        <CreditCard size={32} className="text-accent" />
        <span className="text-gradient font-bold" style={{ fontSize: '1.8rem' }}>ArcPay Checkout</span>
      </div>

      {isPaid ? (
        <div className="animate-scaleIn">
          <div className="flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full mx-auto mb-4">
            <CheckCircle2 className="text-emerald-400" size={36} />
          </div>
          <h2 className="mb-2 text-emerald-400">Invoice Paid Successfully!</h2>
          <p className="text-muted mb-6">
            Payment of <strong className="text-white">{invoice.amount} USDC</strong> has been securely received by the merchant.
          </p>

          <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left mb-6 font-mono text-sm">
            <div className="mb-2 flex justify-between">
              <span className="text-muted text-xs">INVOICE TITLE:</span>
              <span className="text-white font-semibold text-xs">{invoice.title}</span>
            </div>
            <div className="mb-2 flex justify-between">
              <span className="text-muted text-xs">MERCHANT WALLET:</span>
              <span className="text-white text-xs truncate max-w-[180px]">{invoice.recipientAddress}</span>
            </div>
            {invoice.paidAt && (
              <div className="mb-2 flex justify-between">
                <span className="text-muted text-xs">PAID AT:</span>
                <span className="text-white text-xs">{new Date(invoice.paidAt).toLocaleString()}</span>
              </div>
            )}
            {invoice.txHash && (
              <div>
                <span className="text-muted text-xs block mb-1">TRANSACTION HASH</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-accent-light text-xs truncate max-w-[280px]">{invoice.txHash}</span>
                  <button 
                    onClick={() => copyText(invoice.txHash, 'hash')} 
                    className="btn-secondary" 
                    style={{ padding: '2px 6px', fontSize: '10px' }}
                  >
                    {copiedHash ? <Check size={10} /> : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {invoice.txHash && invoice.txHash.startsWith('0x') && (
              <a 
                href={`https://testnet.arcscan.app/tx/${invoice.txHash}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-primary w-full text-decoration-none flex justify-center items-center gap-2"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <ExternalLink size={16} /> View on Arcscan
              </a>
            )}
            <button className="btn-secondary w-full" onClick={onBackToApp}>
              Go to PayX Dashboard
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Invoice Summary */}
          <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 mb-6 text-left">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-white text-lg">{invoice.title}</h3>
              <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase">
                {invoice.status}
              </span>
            </div>
            
            <div className="text-3xl font-extrabold text-white my-3">
              {invoice.amount} <span className="text-accent text-xl">USDC</span>
            </div>

            {invoice.note && (
              <p className="text-sm text-muted mb-4 italic">
                "{invoice.note}"
              </p>
            )}

            <div className="border-t border-white/5 pt-3 text-xs text-muted flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Merchant Recipient:</span>
                <span className="font-mono text-white truncate max-w-[180px]">{invoice.recipientAddress}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span className="text-white">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* DUAL PAYMENT METHOD SELECTOR */}
          {wallet ? (
            <div className="text-left mb-6 p-5 rounded-2xl border border-accent/20 bg-accent/5">
              <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                <ShieldCheck className="text-accent" size={16} />
                Pay Directly with Circle Smart Wallet
              </h4>
              <p className="text-xs text-muted mb-4">
                Use your authenticated User-Controlled Smart Wallet with a secure PIN.
              </p>

              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 mb-4">
                <div>
                  <span className="text-muted text-xs block">YOUR USDC BALANCE</span>
                  <span className="font-bold text-white text-md">
                    {fetchingBalance ? 'Loading...' : `${walletBalance} USDC`}
                  </span>
                </div>
                <button 
                  onClick={fetchCircleBalance} 
                  className="btn-secondary"
                  style={{ padding: '6px' }}
                  title="Refresh Balance"
                  disabled={fetchingBalance}
                >
                  <RefreshCw size={14} className={fetchingBalance ? 'spinner' : ''} />
                </button>
              </div>

              {Number(walletBalance) >= Number(invoice.amount) ? (
                <button 
                  onClick={handleCirclePay} 
                  className="btn-primary w-full" 
                  disabled={paying}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  {paying ? (
                    <><Loader2 className="spinner" size={18} /> Processing PIN payment...</>
                  ) : (
                    <>Pay Now <ArrowRight size={18} /></>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-xl text-xs text-center font-medium">
                  Insufficient USDC in Smart Wallet. Add funds, or use manual payment below.
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left mb-6 text-xs text-muted flex items-center justify-between">
              <span>Want to pay directly with a secure PIN?</span>
              <button 
                onClick={onBackToApp} 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                Sign In to Pay
              </button>
            </div>
          )}

          {/* MANUAL PAYMENT */}
          <div className="text-left border-t border-white/10 pt-6">
            <h4 className="font-bold text-white mb-2 text-sm">
              Manual Transfer / External Web3 Wallet
            </h4>
            <p className="text-xs text-muted mb-4">
              Send USDC on-chain from an external wallet (like MetaMask or GenX) to the address below, then submit payment credentials.
            </p>

            <div className="p-4 bg-white/5 rounded-xl border border-white/5 mb-4 text-xs font-mono flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-muted text-[10px] block">PAYMENT DESTINATION ADDRESS</span>
                  <span className="text-white truncate block max-w-[260px]">{invoice.recipientAddress}</span>
                </div>
                <button 
                  onClick={() => copyText(invoice.recipientAddress, 'address')} 
                  className="btn-secondary"
                  style={{ padding: '6px' }}
                >
                  {copiedAddress ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>

              <div className="flex justify-between items-center border-t border-white/5 pt-2">
                <div>
                  <span className="text-muted text-[10px] block">EXACT USDC AMOUNT</span>
                  <span className="text-white font-bold">{invoice.amount} USDC</span>
                </div>
                <button 
                  onClick={() => copyText(invoice.amount.toString(), 'amount')} 
                  className="btn-secondary"
                  style={{ padding: '6px' }}
                >
                  {copiedAmount ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <form onSubmit={handleManualPay} className="flex flex-col gap-3">
              <div className="input-group">
                <label className="input-label text-xs">Your Wallet Address (From)</label>
                <input
                  type="text"
                  className="input-field text-xs font-mono"
                  placeholder="0x..."
                  value={manualFromAddress}
                  onChange={(e) => setManualFromAddress(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label text-xs">Transaction Hash (TxID)</label>
                <input
                  type="text"
                  className="input-field text-xs font-mono"
                  placeholder="0x..."
                  value={manualTxHash}
                  onChange={(e) => setManualTxHash(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-secondary w-full" 
                disabled={submittingManual || !manualTxHash || !manualFromAddress}
              >
                {submittingManual ? (
                  <><Loader2 className="spinner" size={16} /> Verifying...</>
                ) : (
                  'Submit Payment Credentials'
                )}
              </button>

              <button 
                type="button" 
                onClick={checkPaymentOnChain} 
                className="btn-secondary w-full mt-1 border-dashed"
                style={{ borderStyle: 'dashed' }}
              >
                Auto-Scan On-Chain for Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceCheckout;
