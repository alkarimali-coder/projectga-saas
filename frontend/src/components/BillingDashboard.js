import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { 
    CreditCard, 
    DollarSign, 
    Calendar, 
    Users, 
    Server,
    Download,
    Settings,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Receipt,
    ShieldCheck
} from 'lucide-react';

const BillingDashboard = () => {
    const [billingData, setBillingData] = useState(null);
    const [pricingPlans, setPricingPlans] = useState([]);
    const [subscriptionPackages, setSubscriptionPackages] = useState({});
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedPlan, setSelectedPlan] = useState('');
    const [machineCount, setMachineCount] = useState(1);
    const [userCount, setUserCount] = useState(1);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    useEffect(() => {
        loadBillingData();
        loadPricingPlans();
        loadSubscriptionPackages();
        loadInvoices();
    }, []);

    const loadBillingData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/billing/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setBillingData(data);
            } else {
                throw new Error('Failed to load billing data');
            }
        } catch (error) {
            console.error('Error loading billing data:', error);
            setMessage({ type: 'error', text: 'Failed to load billing dashboard' });
        } finally {
            setLoading(false);
        }
    };

    const loadPricingPlans = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/billing/pricing-plans`);
            if (response.ok) {
                const plans = await response.json();
                setPricingPlans(plans);
            }
        } catch (error) {
            console.error('Error loading pricing plans:', error);
        }
    };

    const loadSubscriptionPackages = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/billing/packages`);
            if (response.ok) {
                const packages = await response.json();
                setSubscriptionPackages(packages);
            }
        } catch (error) {
            console.error('Error loading packages:', error);
        }
    };

    const loadInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/billing/invoices`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const invoiceData = await response.json();
                setInvoices(invoiceData);
            }
        } catch (error) {
            console.error('Error loading invoices:', error);
        }
    };

    const calculatePricing = (plan, machines, users, interval) => {
        if (!plan) return 0;
        const machinePrice = interval === 'monthly' ? plan.price_per_machine_monthly : plan.price_per_machine_yearly;
        const userPrice = interval === 'monthly' ? plan.price_per_user_monthly : plan.price_per_user_yearly;
        return (machines * machinePrice) + (users * userPrice);
    };

    const handleSubscriptionUpgrade = async () => {
        if (!selectedPlan) {
            setMessage({ type: 'error', text: 'Please select a pricing plan' });
            return;
        }

        try {
            setMessage({ type: 'info', text: 'Creating subscription...' });

            const token = localStorage.getItem('token');
            
            // First create the subscription
            const subscriptionResponse = await fetch(`${backendUrl}/api/billing/subscriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_id: billingData.customer.id,
                    pricing_plan_id: selectedPlan,
                    billing_interval: 'monthly',
                    machine_count: machineCount,
                    user_count: userCount
                })
            });

            if (subscriptionResponse.ok) {
                const subscription = await subscriptionResponse.json();
                
                // Create checkout session for payment
                const checkoutData = new FormData();
                checkoutData.append('subscription_id', subscription.id);

                const checkoutResponse = await fetch(`${backendUrl}/api/billing/checkout/subscription`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: checkoutData
                });

                if (checkoutResponse.ok) {
                    const { url } = await checkoutResponse.json();
                    window.location.href = url; // Redirect to Stripe checkout
                } else {
                    throw new Error('Failed to create checkout session');
                }
            } else {
                const errorData = await subscriptionResponse.json();
                throw new Error(errorData.detail || 'Failed to create subscription');
            }
        } catch (error) {
            console.error('Error creating subscription:', error);
            setMessage({ type: 'error', text: error.message });
        }
    };

    const handleInvoicePayment = async (invoiceId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/billing/invoices/${invoiceId}/pay`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const { url } = await response.json();
                window.location.href = url; // Redirect to Stripe checkout
            } else {
                throw new Error('Failed to create payment session');
            }
        } catch (error) {
            console.error('Error creating payment:', error);
            setMessage({ type: 'error', text: error.message });
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active':
            case 'paid':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'past_due':
            case 'open':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'canceled':
            case 'void':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">Loading billing dashboard...</div>
            </div>
        );
    }

    const selectedPricingPlan = pricingPlans.find(plan => plan.id === selectedPlan);
    const currentSubscription = billingData?.subscription;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Billing & Subscriptions</h1>
                <p className="text-gray-600">
                    Manage your COAM SaaS subscription, view invoices, and track usage
                </p>
            </div>

            {message.text && (
                <Alert className={`mb-4 ${message.type === 'error' ? 'border-red-500' : 
                    message.type === 'success' ? 'border-green-500' : 'border-blue-500'}`}>
                    <AlertDescription>
                        {message.text}
                    </AlertDescription>
                </Alert>
            )}

            {/* Navigation Tabs */}
            <div className="flex space-x-1 mb-6 border-b">
                {[
                    { id: 'overview', label: 'Overview', icon: DollarSign },
                    { id: 'subscription', label: 'Subscription', icon: CreditCard },
                    { id: 'invoices', label: 'Invoices', icon: Receipt },
                    { id: 'usage', label: 'Usage', icon: TrendingUp }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm ${
                            activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <tab.icon className="h-4 w-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* Current Plan */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Current Plan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {currentSubscription ? 'Active' : 'No Plan'}
                            </div>
                            <p className="text-xs text-gray-600">
                                {currentSubscription ? `${currentSubscription.billing_interval} billing` : 'Get started today'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Monthly Cost */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <DollarSign className="h-4 w-4 mr-2" />
                                Monthly Cost
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(billingData?.monthly_cost || 0)}
                            </div>
                            <p className="text-xs text-gray-600">
                                Current billing amount
                            </p>
                        </CardContent>
                    </Card>

                    {/* Machine Count */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <Server className="h-4 w-4 mr-2" />
                                Machines
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {currentSubscription?.machine_count || 0}
                            </div>
                            <p className="text-xs text-gray-600">
                                Active machines
                            </p>
                        </CardContent>
                    </Card>

                    {/* User Count */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {currentSubscription?.user_count || 0}
                            </div>
                            <p className="text-xs text-gray-600">
                                Active users
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
                <div className="space-y-6">
                    {currentSubscription ? (
                        /* Current Subscription Details */
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <CreditCard className="h-5 w-5 mr-2" />
                                    Current Subscription
                                    {getStatusIcon(currentSubscription.status)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Status</label>
                                        <p className="capitalize">{currentSubscription.status}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Billing Interval</label>
                                        <p className="capitalize">{currentSubscription.billing_interval}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Next Billing Date</label>
                                        <p>{formatDate(currentSubscription.current_period_end)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Total Amount</label>
                                        <p className="font-bold text-lg">{formatCurrency(currentSubscription.total_amount)}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <Button variant="outline" className="mr-2">
                                        <Settings className="h-4 w-4 mr-2" />
                                        Manage Subscription
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        /* New Subscription Setup */
                        <Card>
                            <CardHeader>
                                <CardTitle>Subscribe to COAM SaaS</CardTitle>
                                <p className="text-gray-600">Choose a plan that fits your business needs</p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    {pricingPlans.map(plan => (
                                        <div 
                                            key={plan.id}
                                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                                selectedPlan === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                            }`}
                                            onClick={() => setSelectedPlan(plan.id)}
                                        >
                                            <h3 className="font-bold text-lg">{plan.name}</h3>
                                            <p className="text-gray-600 text-sm mb-2">{plan.description}</p>
                                            <div className="text-sm text-gray-500">
                                                <div>Machines: ${plan.price_per_machine_monthly}/month</div>
                                                <div>Users: ${plan.price_per_user_monthly}/month</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Number of Machines</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={machineCount}
                                            onChange={(e) => setMachineCount(parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Number of Users</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={userCount}
                                            onChange={(e) => setUserCount(parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                </div>

                                {selectedPricingPlan && (
                                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                        <h4 className="font-medium mb-2">Pricing Summary</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>Machines ({machineCount} × ${selectedPricingPlan.price_per_machine_monthly})</span>
                                                <span>{formatCurrency(machineCount * selectedPricingPlan.price_per_machine_monthly)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Users ({userCount} × ${selectedPricingPlan.price_per_user_monthly})</span>
                                                <span>{formatCurrency(userCount * selectedPricingPlan.price_per_user_monthly)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold pt-2 border-t">
                                                <span>Total Monthly</span>
                                                <span>{formatCurrency(calculatePricing(selectedPricingPlan, machineCount, userCount, 'monthly'))}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button 
                                    onClick={handleSubscriptionUpgrade}
                                    disabled={!selectedPlan}
                                    className="w-full"
                                >
                                    Subscribe Now
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Receipt className="h-5 w-5 mr-2" />
                            Invoices
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {invoices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-2">Invoice #</th>
                                            <th className="text-left p-2">Date</th>
                                            <th className="text-left p-2">Amount</th>
                                            <th className="text-left p-2">Status</th>
                                            <th className="text-left p-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map(invoice => (
                                            <tr key={invoice.id} className="border-b">
                                                <td className="p-2 font-mono">{invoice.invoice_number}</td>
                                                <td className="p-2">{formatDate(invoice.issue_date)}</td>
                                                <td className="p-2">{formatCurrency(invoice.total)}</td>
                                                <td className="p-2">
                                                    <div className="flex items-center">
                                                        {getStatusIcon(invoice.status)}
                                                        <span className="ml-2 capitalize">{invoice.status}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    {invoice.status === 'open' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleInvoicePayment(invoice.id)}
                                                        >
                                                            Pay Now
                                                        </Button>
                                                    )}
                                                    {invoice.invoice_pdf_url && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => window.open(invoice.invoice_pdf_url, '_blank')}
                                                        >
                                                            <Download className="h-4 w-4 mr-1" />
                                                            PDF
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No invoices available</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <TrendingUp className="h-5 w-5 mr-2" />
                            Usage Analytics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-gray-500">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Usage analytics will be available in your next billing cycle</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default BillingDashboard;