import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import bannerImg from '../assest/designer-bg.png';

export default function AdminDesignerGrid({ designers, onDesignerSelect }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All Designers');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [kycFilter, setKycFilter] = useState('All');

  const filteredDesigners = designers.filter(d => {
    if (activeTab === 'Pending Approval' && ['ACTIVE', 'LIVE', 'INACTIVE', 'REJECTED'].includes(d.stage)) return false;
    if (activeTab === 'Active Designers' && d.stage !== 'ACTIVE' && d.stage !== 'LIVE') return false;
    if (activeTab === 'Inactive Designers' && d.stage !== 'INACTIVE' && d.stage !== 'REJECTED') return false;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const matchName = (d.brand_name || d.name || d.designer_name || '').toLowerCase().includes(lowerSearch);
      const matchCategory = (d.category || '').toLowerCase().includes(lowerSearch);
      const matchId = String(d.id || '').toLowerCase().includes(lowerSearch);
      if (!matchName && !matchCategory && !matchId) return false;
    }

    if (categoryFilter !== 'All' && d.category !== categoryFilter) return false;
    if (locationFilter !== 'All' && d.city !== locationFilter) return false;
    if (kycFilter !== 'All') {
      const isKyc = d.is_kyc_verified ?? (d.kyc_verified || d.kyc_status === 'VERIFIED');
      if (kycFilter === 'Verified' && !isKyc) return false;
      if (kycFilter === 'Pending' && (isKyc || d.kyc_status === 'REJECTED')) return false;
      if (kycFilter === 'Rejected' && d.kyc_status !== 'REJECTED') return false;
    }
    return true;
  });

  const totalDesigners = designers.length;
  const newRegistrations = designers.filter(d => ['LEAD', 'QUALIFIED'].includes(d.stage)).length;
  const activeDesignersCount = designers.filter(d => d.stage === 'ACTIVE' || d.stage === 'LIVE').length;
  const pendingApprovals = designers.filter(d => !['ACTIVE', 'LIVE', 'INACTIVE', 'REJECTED', 'LEAD', 'QUALIFIED'].includes(d.stage)).length;

  return (
    <div className="ZENVE-admin-grid-container" style={{ padding: '20px', background: '#Fdfcf7', minHeight: '100vh', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Banner */}


      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FDF5E6', padding: '12px', borderRadius: '50%', color: '#B4843D', fontSize: '20px' }}>👥</div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Total Designers</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>{totalDesigners}</div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FDF5E6', padding: '12px', borderRadius: '50%', color: '#B4843D', fontSize: '20px' }}>👤+</div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>New Registrations</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>{newRegistrations}</div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FDF5E6', padding: '12px', borderRadius: '50%', color: '#B4843D', fontSize: '20px' }}>✅</div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Active Designers</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>{activeDesignersCount}</div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FDF5E6', padding: '12px', borderRadius: '50%', color: '#B4843D', fontSize: '20px' }}>🕒</div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Pending Approvals</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>{pendingApprovals}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: '#fff', borderRadius: '8px', border: '1px solid #eee', width: 'fit-content', marginBottom: '16px' }}>
        {['All Designers', 'Pending Approval', 'Active Designers', 'Inactive Designers'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 24px', background: activeTab === tab ? '#B4843D' : 'transparent', color: activeTab === tab ? '#fff' : '#666', border: 'none', borderRadius: activeTab === tab ? '8px' : '0', fontWeight: 600, cursor: 'pointer' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search by name, category, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', border: '1px solid #eee', borderRadius: '6px', background: '#f9f9f9', outline: 'none' }} />
        
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ padding: '10px', border: '1px solid #eee', borderRadius: '6px', outline: 'none' }}>
          <option value="All">Category: All</option>
          {[...new Set(['People', 'Pet', ...designers.map(d => d.category).filter(Boolean)])].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} style={{ padding: '10px', border: '1px solid #eee', borderRadius: '6px', outline: 'none' }}>
          <option value="All">Location: All</option>
          {[...new Set(designers.map(d => d.city).filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        <select value={kycFilter} onChange={e => setKycFilter(e.target.value)} style={{ padding: '10px', border: '1px solid #eee', borderRadius: '6px', outline: 'none' }}>
          <option value="All">KYC Status: All</option>
          <option value="Verified">Verified</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>
        
        <button onClick={() => { setSearchTerm(''); setCategoryFilter('All'); setLocationFilter('All'); setKycFilter('All'); setActiveTab('All Designers'); }} style={{ padding: '10px 16px', background: '#FDF5E6', color: '#B4843D', border: '1px solid #B4843D', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>↻ Reset</button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredDesigners.length === 0 && <div style={{ padding: '40px', gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>No designers match the selected filters.</div>}
        {filteredDesigners.map(d => (
          <div key={d.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onClick={() => onDesignerSelect(d.id)} onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'} onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#eee', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#aaa' }}>
                {d.profile_image ? <img src={d.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
              </div>
              <div style={{ background: d.stage === 'ACTIVE' || d.stage === 'LIVE' || !d.stage ? '#e6f4ea' : '#fce8e6', color: d.stage === 'ACTIVE' || d.stage === 'LIVE' || !d.stage ? '#159447' : '#d93025', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                {d.stage || 'N/A'}
              </div>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#111' }}>{d.brand_name || d.name || d.designer_name || `Designer #${d.id}`}</h3>
            <div style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '2px' }}>{d.id || `DGN${d.id}`}</div>
              <div style={{ marginBottom: '2px' }}>👗 {d.category || 'N/A'}</div>
              <div>📍 {d.city || 'N/A'}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111' }}>{d.products_count || 0}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>Products</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111' }}>₹{d.sales ? d.sales.toLocaleString('en-IN') : '0'}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>Sales</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#B4843D' }}>★ {d.rating || 'N/A'}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>Rating</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #B4843D', color: '#B4843D', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onDesignerSelect(d.id); }}>View Profile</button>
              <button style={{ flex: 1, padding: '10px', background: '#B4843D', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); navigate(`/catalogue?designer=${d.id}`); }}>View Products</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
