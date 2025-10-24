import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, Camera, DollarSign, AlertCircle, CheckCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { createWorker } from 'tesseract.js';

const ExpenseSubmission = ({ onSubmissionComplete }) => {
    const [formData, setFormData] = useState({
        amount: '',
        category: '',
        description: '',
        machine_id: '',
        location_id: '',
        job_id: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [ocrData, setOcrData] = useState(null);
    const [showOcrData, setShowOcrData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [machines, setMachines] = useState([]);
    const [locations, setLocations] = useState([]);
    const [manualMode, setManualMode] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    const expenseCategories = [
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'parts', label: 'Parts' },
        { value: 'labor', label: 'Labor' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'rent', label: 'Rent' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'taxes', label: 'Taxes' },
        { value: 'administrative', label: 'Administrative' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        fetchMachines();
        fetchLocations();
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

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/locations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLocations(data);
            }
        } catch (err) {
            console.error('Error fetching locations:', err);
        }
    };

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                setMessage({ type: 'error', text: 'Please select a JPEG, PNG, or PDF file' });
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'File size must be less than 5MB' });
                return;
            }

            setSelectedFile(file);
            
            // Create preview URL (only for images)
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null); // PDF files won't have image preview
            }
            
            // Clear previous OCR data
            setOcrData(null);
            setMessage({ type: '', text: '' });
        }
    };

    const processOCR = async () => {
        if (!selectedFile) return;

        // Check if PDF file - show info message for now
        if (selectedFile.type === 'application/pdf') {
            setMessage({ 
                type: 'warning', 
                text: 'PDF OCR processing is not yet supported. Please use image files (JPEG, PNG) or enter details manually.' 
            });
            return;
        }

        setIsProcessingOcr(true);
        setMessage({ type: 'info', text: 'Processing invoice with OCR... This may take a few moments.' });

        let worker;
        try {
            // Create Tesseract.js worker
            worker = await createWorker('eng');
            
            // Process the file with OCR
            const { data: { text, confidence } } = await worker.recognize(selectedFile);
            
            console.log('OCR Text:', text);
            console.log('OCR Confidence:', confidence);

            // Extract relevant information from OCR text
            const extractedData = extractInvoiceData(text);
            extractedData.confidence_score = confidence / 100; // Convert to decimal
            
            setOcrData(extractedData);
            setShowOcrData(true); // Auto-show OCR results
            
            // Auto-populate form if OCR found data
            if (extractedData.total_amount) {
                handleInputChange('amount', extractedData.total_amount.toString());
            }
            if (extractedData.vendor_name) {
                handleInputChange('description', `Invoice from ${extractedData.vendor_name}${extractedData.part_description ? ` - ${extractedData.part_description}` : ''}`);
            } else if (extractedData.part_description) {
                handleInputChange('description', extractedData.part_description);
            }

            setMessage({ 
                type: 'success', 
                text: `OCR completed with ${confidence.toFixed(1)}% confidence. Please verify the extracted data.` 
            });
            
        } catch (error) {
            console.error('OCR processing error:', error);
            setMessage({ 
                type: 'warning', 
                text: `OCR processing failed: ${error.message}. You can still submit manually.` 
            });
        } finally {
            if (worker) {
                await worker.terminate();
            }
            setIsProcessingOcr(false);
        }
    };

    // Helper function to extract invoice data from OCR text
    const extractInvoiceData = (text) => {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const extractedData = {
            vendor_name: null,
            part_description: null,
            total_amount: null,
            date: null
        };

        // Common patterns for extracting data
        const amountPatterns = [
            /(?:total|amount|sum|price|cost)[\s:]*\$?([0-9,]+\.?[0-9]*)/i,
            /\$([0-9,]+\.?[0-9]*)/g,
            /([0-9,]+\.[0-9]{2})/g
        ];

        const datePatterns = [
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
            /(\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
            /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{2,4}/gi
        ];

        // Extract amounts
        let amounts = [];
        for (const pattern of amountPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const numberMatch = match.match(/([0-9,]+\.?[0-9]*)/);
                    if (numberMatch) {
                        const amount = parseFloat(numberMatch[1].replace(/,/g, ''));
                        if (amount > 0 && amount < 100000) { // Reasonable range
                            amounts.push(amount);
                        }
                    }
                });
            }
        }

        // Use the largest amount as total (often the case)
        if (amounts.length > 0) {
            extractedData.total_amount = Math.max(...amounts);
        }

        // Extract dates
        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                extractedData.date = matches[0];
                break;
            }
        }

        // Extract vendor name (usually first few lines or after specific keywords)
        const vendorKeywords = ['vendor', 'company', 'business', 'corp', 'inc', 'llc', 'ltd'];
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            // Skip lines that look like addresses or phone numbers
            if (!/^\d+\s/.test(line) && !/\d{3}-\d{3}-\d{4}/.test(line) && line.length > 2) {
                if (!extractedData.vendor_name || vendorKeywords.some(keyword => 
                    line.toLowerCase().includes(keyword))) {
                    extractedData.vendor_name = line;
                }
            }
        }

        // Extract part description (look for product/part keywords)
        const partKeywords = ['part', 'product', 'item', 'service', 'repair', 'maintenance', 'component'];
        for (const line of lines) {
            if (partKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
                extractedData.part_description = line;
                break;
            }
        }

        return extractedData;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!formData.amount || !formData.category || !formData.description) {
            setMessage({ type: 'error', text: 'Please fill in amount, category, and description' });
            return;
        }

        setIsSubmitting(true);
        setMessage({ type: 'info', text: 'Submitting expense...' });

        try {
            const submitFormData = new FormData();
            submitFormData.append('amount', parseFloat(formData.amount));
            submitFormData.append('category', formData.category);
            submitFormData.append('description', formData.description);
            
            if (formData.machine_id) {
                submitFormData.append('machine_id', formData.machine_id);
            }
            if (formData.location_id) {
                submitFormData.append('location_id', formData.location_id);
            }
            if (formData.job_id) {
                submitFormData.append('job_id', formData.job_id);
            }
            if (selectedFile) {
                submitFormData.append('invoice_file', selectedFile);
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/financial/expense-submission`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: submitFormData
            });

            if (response.ok) {
                const result = await response.json();
                setMessage({ 
                    type: 'success', 
                    text: `Expense submitted successfully! ${result.requires_approval ? '(Requires approval)' : ''}` 
                });
                
                // Reset form
                setFormData({
                    amount: '',
                    category: '',
                    description: '',
                    machine_id: '',
                    location_id: '',
                    job_id: ''
                });
                setSelectedFile(null);
                setPreviewUrl(null);
                setOcrData(null);
                
                // Notify parent component
                if (onSubmissionComplete) {
                    onSubmissionComplete(result);
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Expense submission failed');
            }
        } catch (error) {
            console.error('Expense submission error:', error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <DollarSign className="h-6 w-6 mr-2" />
                    Submit Expense
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {message.text && (
                    <Alert className={
                        message.type === 'error' ? 'border-red-200 bg-red-50' :
                        message.type === 'success' ? 'border-green-200 bg-green-50' :
                        message.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                    }>
                        {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
                        {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
                        {message.type === 'info' && <Loader className="h-4 w-4 animate-spin" />}
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Invoice Upload Section */}
                    {!manualMode && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Invoice/Receipt Upload (Optional)</h3>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,.pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="invoice-upload"
                            />
                            <label htmlFor="invoice-upload" className="cursor-pointer">
                                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-lg font-medium">Upload Invoice or Receipt</p>
                                <p className="text-sm text-gray-500 mb-2">
                                    Supports: JPEG, PNG, PDF files
                                </p>
                                <p className="text-xs text-gray-400">
                                    OCR will extract: vendor name, amount, description, date
                                </p>
                            </label>
                        </div>

                        <div className="flex items-center justify-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setManualMode(!manualMode)}
                                className="text-sm"
                            >
                                {manualMode ? '📄 Use OCR Upload' : '✏️ Enter Details Manually'}
                            </Button>
                        </div>

                        {(selectedFile && (previewUrl || selectedFile.type === 'application/pdf')) && (
                            <div className="space-y-4">
                                <div className="relative">
                                    {previewUrl ? (
                                        <img 
                                            src={previewUrl} 
                                            alt="Invoice preview" 
                                            className="max-w-full h-64 object-contain border rounded"
                                        />
                                    ) : (
                                        <div className="h-64 border rounded flex items-center justify-center bg-gray-50">
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">📄</div>
                                                <div className="font-medium">{selectedFile.name}</div>
                                                <div className="text-sm text-gray-500">PDF file selected</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex space-x-2">
                                    <Button 
                                        type="button"
                                        onClick={processOCR}
                                        disabled={isProcessingOcr}
                                        className="flex items-center"
                                    >
                                        {isProcessingOcr ? (
                                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Camera className="h-4 w-4 mr-2" />
                                        )}
                                        {isProcessingOcr ? 'Processing...' : 'Extract Data with OCR'}
                                    </Button>
                                    
                                    <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setPreviewUrl(null);
                                            setOcrData(null);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        )}

                        {ocrData && (
                            <div className="bg-gray-50 p-4 rounded border">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium">OCR Results</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowOcrData(!showOcrData)}
                                    >
                                        {showOcrData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        {showOcrData ? 'Hide' : 'Show'} Details
                                    </Button>
                                </div>
                                
                                {showOcrData && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            {ocrData.total_amount && (
                                                <div className="flex justify-between">
                                                    <span className="font-medium">Amount:</span>
                                                    <span className="text-green-600">${ocrData.total_amount}</span>
                                                </div>
                                            )}
                                            {ocrData.vendor_name && (
                                                <div className="flex justify-between">
                                                    <span className="font-medium">Vendor:</span>
                                                    <span>{ocrData.vendor_name}</span>
                                                </div>
                                            )}
                                            {ocrData.part_description && (
                                                <div className="flex justify-between">
                                                    <span className="font-medium">Description:</span>
                                                    <span className="text-right">{ocrData.part_description}</span>
                                                </div>
                                            )}
                                            {ocrData.date && (
                                                <div className="flex justify-between">
                                                    <span className="font-medium">Date:</span>
                                                    <span>{ocrData.date}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-2 border-t">
                                            <div className="text-xs text-gray-500">
                                                Confidence: {(ocrData.confidence_score * 100).toFixed(1)}%
                                            </div>
                                            {ocrData.confidence_score < 0.7 && (
                                                <div className="text-xs text-amber-600">
                                                    ⚠️ Low confidence - please verify data
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        </div>
                    )}

                    {/* Expense Details Form */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Expense Details</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Amount *
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Category *
                                </label>
                                <Select 
                                    value={formData.category} 
                                    onValueChange={(value) => handleInputChange('category', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {expenseCategories.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Description *
                            </label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Describe the expense..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Machine (Optional)
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
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Location (Optional)
                                </label>
                                <Select 
                                    value={formData.location_id} 
                                    onValueChange={(value) => handleInputChange('location_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map(location => (
                                            <SelectItem key={location.id} value={location.id}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Job ID (Optional)
                            </label>
                            <Input
                                type="text"
                                value={formData.job_id}
                                onChange={(e) => handleInputChange('job_id', e.target.value)}
                                placeholder="Related job ID"
                            />
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Expense'
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default ExpenseSubmission;