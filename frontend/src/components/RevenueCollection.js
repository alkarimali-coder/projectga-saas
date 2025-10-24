import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { DollarSign, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const RevenueCollection = ({ onCollectionComplete }) => {
    const [formData, setFormData] = useState({
        machine_id: '',
        collection_date: new Date().toISOString().split('T')[0],
        gross_amount: '',
        collection_method: 'cash',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [machines, setMachines] = useState([]);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    const collectionMethods = [
        { value: 'cash', label: 'Cash' },
        { value: 'digital', label: 'Digital' },
        { value: 'mixed', label: 'Mixed' }
    ];

    useEffect(() => {
        fetchMachines();
    }, []);

    const fetchMachines = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/machines`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMachines(data);
            }
        } catch (err) {
            console.error('Error fetching machines:', err);
        }
    };

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!formData.machine_id || !formData.gross_amount) {
            setMessage({ type: 'error', text: 'Please select a machine and enter the collection amount' });
            return;
        }

        const amount = parseFloat(formData.gross_amount);
        if (isNaN(amount) || amount <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid amount greater than 0' });
            return;
        }

        setIsSubmitting(true);
        setMessage({ type: 'info', text: 'Processing revenue collection...' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/financial/revenue-collection`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    machine_id: formData.machine_id,
                    collection_date: formData.collection_date,
                    gross_amount: amount,
                    collection_method: formData.collection_method,
                    notes: formData.notes || null
                })
            });

            if (response.ok) {
                const result = await response.json();
                setMessage({ 
                    type: 'success', 
                    text: `Revenue collected successfully! Gross: $${result.gross_revenue.toFixed(2)}, ML Share: $${result.ml_share.toFixed(2)}, Location Share: $${result.location_share.toFixed(2)}` 
                });
                
                // Reset form
                setFormData({
                    machine_id: '',
                    collection_date: new Date().toISOString().split('T')[0],
                    gross_amount: '',
                    collection_method: 'cash',
                    notes: ''
                });
                
                // Notify parent component
                if (onCollectionComplete) {
                    onCollectionComplete(result);
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Revenue collection failed');
            }
        } catch (error) {
            console.error('Revenue collection error:', error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedMachine = machines.find(m => m.id === formData.machine_id);

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <DollarSign className="h-6 w-6 mr-2" />
                    Revenue Collection
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {message.text && (
                    <Alert className={
                        message.type === 'error' ? 'border-red-200 bg-red-50' :
                        message.type === 'success' ? 'border-green-200 bg-green-50' :
                        'border-blue-200 bg-blue-50'
                    }>
                        {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
                        {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
                        {message.type === 'info' && <Loader className="h-4 w-4 animate-spin" />}
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Machine *
                        </label>
                        <Select 
                            value={formData.machine_id} 
                            onValueChange={(value) => handleInputChange('machine_id', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select machine" />
                            </SelectTrigger>
                            <SelectContent>
                                {machines.map(machine => (
                                    <SelectItem key={machine.id} value={machine.id}>
                                        {machine.model} - {machine.serial_number}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {selectedMachine && (
                            <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                <div><strong>Selected Machine:</strong> {selectedMachine.model}</div>
                                <div><strong>Serial Number:</strong> {selectedMachine.serial_number}</div>
                                <div><strong>Status:</strong> {selectedMachine.status}</div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Collection Date *
                            </label>
                            <Input
                                type="date"
                                value={formData.collection_date}
                                onChange={(e) => handleInputChange('collection_date', e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Gross Amount *
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.gross_amount}
                                onChange={(e) => handleInputChange('gross_amount', e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Collection Method
                        </label>
                        <Select 
                            value={formData.collection_method} 
                            onValueChange={(value) => handleInputChange('collection_method', value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {collectionMethods.map(method => (
                                    <SelectItem key={method.value} value={method.value}>
                                        {method.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Notes (Optional)
                        </label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            placeholder="Additional notes about this collection..."
                            rows={3}
                        />
                    </div>

                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">Revenue Split Information</h4>
                        <p className="text-sm text-blue-700">
                            The revenue will be automatically split according to the location contract. 
                            Commission calculations and financial transactions will be created automatically.
                        </p>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                                Processing Collection...
                            </>
                        ) : (
                            'Record Revenue Collection'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default RevenueCollection;