import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  AlertCircle
} from 'lucide-react';

const TenantManagement = () => {
  const { isAdmin } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const [newTenant, setNewTenant] = useState({
    company_name: '',
    business_type: 'Technology',
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    phone: '',
    website: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States'
  });

  useEffect(() => {
    if (isAdmin) {
      fetchTenants();
    }
  }, [isAdmin]);

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/tenants`);
      setTenants(response.data.tenants || []);
    } catch (err) {
      setError('Failed to load tenants');
      console.error('Tenants fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');

    try {
      await axios.post(`${backendUrl}/api/tenants`, newTenant);
      
      // Reset form and refresh list
      setNewTenant({
        company_name: '',
        business_type: 'Technology',
        admin_email: '',
        admin_first_name: '',
        admin_last_name: '',
        phone: '',
        website: '',
        address_line1: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'United States'
      });
      setShowCreateForm(false);
      await fetchTenants();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create tenant');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.admin_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#f59e0b', margin: '0 auto 1rem' }} />
        <h2>Access Denied</h2>
        <p>You need administrator privileges to access tenant management.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div>Loading tenants...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Tenant Management
          </h1>
          <p style={{ color: '#6b7280' }}>
            Manage tenants and their configurations
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Add Tenant
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Create Tenant Form */}
      {showCreateForm && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Create New Tenant
          </h2>
          
          <form onSubmit={handleCreateTenant}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.company_name}
                  onChange={(e) => setNewTenant({...newTenant, company_name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Type</label>
                <select
                  className="form-input"
                  value={newTenant.business_type}
                  onChange={(e) => setNewTenant({...newTenant, business_type: e.target.value})}
                >
                  <option value="Technology">Technology</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={newTenant.admin_email}
                  onChange={(e) => setNewTenant({...newTenant, admin_email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admin First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.admin_first_name}
                  onChange={(e) => setNewTenant({...newTenant, admin_first_name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admin Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.admin_last_name}
                  onChange={(e) => setNewTenant({...newTenant, admin_last_name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant({...newTenant, phone: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Website</label>
                <input
                  type="url"
                  className="form-input"
                  value={newTenant.website}
                  onChange={(e) => setNewTenant({...newTenant, website: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.address_line1}
                  onChange={(e) => setNewTenant({...newTenant, address_line1: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.city}
                  onChange={(e) => setNewTenant({...newTenant, city: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTenant.state}
                  onChange={(e) => setNewTenant({...newTenant, state: e.target.value})}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createLoading}
              >
                {createLoading ? 'Creating...' : 'Create Tenant'}
              </button>
              
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input
              type="text"
              placeholder="Search tenants..."
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tenants List */}
      <div className="card">
        {filteredTenants.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            <Building size={48} style={{ margin: '0 auto 1rem' }} />
            <p>No tenants found</p>
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Admin</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: '500' }}>{tenant.company_name || 'N/A'}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {tenant.business_type}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: '500' }}>
                          {tenant.admin_first_name} {tenant.admin_last_name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Mail size={12} />
                          {tenant.admin_email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        {tenant.phone && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={12} />
                            {tenant.phone}
                          </div>
                        )}
                        {tenant.city && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={12} />
                            {tenant.city}, {tenant.state}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${tenant.status || 'active'}`}>
                        {tenant.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: '#dc2626' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantManagement;