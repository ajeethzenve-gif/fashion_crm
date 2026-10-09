import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AdminDesignerGrid({ designers, onDesignerSelect }) {
  const [activeTab, setActiveTab] = useState('All Designers');

  const totalDesigners = designers.length;
  const newRegistrations = designers.filter(d => d.stage === 'LEAD' || d.status === 'PENDING').length || 14;
  const activeDesignersCount = designers.filter(d => d.status === 'ACTIVE').length || 186;
  const pendingApprovals = designers.filter(d => d.status === 'PENDING').length || 28;

  return (
    <div className="ZENVE-admin-grid-container" style={{ padding: '20px', background: '#Fdfcf7', minHeight: '100vh', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Banner */}
      <div className="ZENVE-admin-banner" style={{ background: 'linear-gradient(to right, #DFB87A, #B4843D)', padding: '30px', borderRadius: '12px', color: '#fff', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '12px', marginBottom: '8px' }}>Home &gt; Designer Portal</div>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Designer Portal</h1>
          <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>Empower designers with tools, resources and marketplace access</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FDF5E6', padding: '12px', borderRadius: '50%', color: '#B4843D', fontSize: '20px' }}>👥</div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Total Designers</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>{totalDesigners} <span style={{ fontSize: '12px', color: '#159447' }}>↗ 12%</span></div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FDF5E6', padding: '12px', borderRadius: '50%', color: '#B4843D', fontSize: '20px' }}>👤+</div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>New Registrations</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>{newRegistrations} <span style={{ fontSize: '12px', color: '#159447' }}>↗ 16%</span></div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FDF5E6', padding: '12px', borderRadius: '50%', color: '#B4843D', fontSize: '20px' }}>✅</div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Active Designers</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>{activeDesignersCount} <span style={{ fontSize: '12px', color: '#159447' }}>↗ 8%</span></div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FDF5E6', padding: '12px', borderRadius: '50%', color: '#B4843D', fontSize: '20px' }}>🕒</div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Pending Approvals</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>{pendingApprovals} <span style={{ fontSize: '12px', color: '#d93025' }}>↘ 5%</span></div>
          </div>
        </div>
        <button style={{ background: '#B4843D', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 24px', fontWeight: 'bold', cursor: 'pointer', height: '100%' }}>+ Add Designer</button>
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
      <div style={{ display: 'flex', gap: '12px', background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '24px', alignItems: 'center' }}>
        <input type="text" placeholder="Search by name, email, category..." style={{ flex: 1, padding: '10px', border: '1px solid #eee', borderRadius: '6px', background: '#f9f9f9', outline: 'none' }} />
        <select style={{ padding: '10px', border: '1px solid #eee', borderRadius: '6px', outline: 'none' }}><option>Category: All</option></select>
        <select style={{ padding: '10px', border: '1px solid #eee', borderRadius: '6px', outline: 'none' }}><option>Location: All</option></select>
        <select style={{ padding: '10px', border: '1px solid #eee', borderRadius: '6px', outline: 'none' }}><option>KYC Status: All</option></select>
        <select style={{ padding: '10px', border: '1px solid #eee', borderRadius: '6px', outline: 'none' }}><option>Status: All</option></select>
        <button style={{ padding: '10px 16px', background: '#FDF5E6', color: '#B4843D', border: '1px solid #B4843D', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>↻ Reset</button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {designers.map(d => (
          <div key={d.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onClick={() => onDesignerSelect(d.id)} onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'} onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#eee', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#aaa' }}>
                {d.profile_image ? <img src={d.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
              </div>
              <div style={{ background: d.status === 'ACTIVE' || !d.status ? '#e6f4ea' : '#fce8e6', color: d.status === 'ACTIVE' || !d.status ? '#159447' : '#d93025', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                {d.status || 'Active'}
              </div>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#111' }}>{d.brand_name || d.name || d.designer_name || `Designer #${d.id}`}</h3>
            <div style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '2px' }}>{d.id || `DGN${d.id}`}</div>
              <div style={{ marginBottom: '2px' }}>👗 {d.category || 'Women Wear'}</div>
              <div>📍 {d.city || 'Chennai, TN'}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111' }}>{d.products_count || Math.floor(Math.random() * 200) + 10}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>Products</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111' }}>₹{d.sales ? d.sales.toLocaleString('en-IN') : '12,48,500'}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>Sales</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#B4843D' }}>★ {d.rating || '4.8'}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>Rating</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #B4843D', color: '#B4843D', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>View Profile</button>
              <button style={{ flex: 1, padding: '10px', background: '#B4843D', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onDesignerSelect(d.id); }}>Manage</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
