import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  QrCode, 
  Camera, 
  Search, 
  ArrowLeft, 
  Package, 
  Wrench,
  MapPin,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useAuth } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Scanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scannerRef = useRef(null);
  
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up scanner on component unmount
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const startQRScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true
      },
      false
    );

    scanner.render(
      (decodedText, decodedResult) => {
        // Success callback
        setScannerActive(false);
        scanner.clear().catch(console.error);
        handleScanResult(decodedText);
      },
      (error) => {
        // Error callback - can be ignored for continuous scanning
      }
    );

    scannerRef.current = scanner;
    setScannerActive(true);
    setError('');
  };

  const stopQRScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      setScannerActive(false);
    }
  };

  const handleScanResult = async (code) => {
    setLoading(true);
    setError('');
    setScanResult(null);

    try {
      // Try to find machine first
      try {
        const machineRes = await axios.get(`${API}/machines/scan/${code}`);
        setScanResult({
          type: 'machine',
          data: machineRes.data
        });
      } catch (machineError) {
        // If machine not found, try to find part
        try {
          const partsRes = await axios.get(`${API}/parts`);
          const part = partsRes.data.find(p => 
            p.barcode === code || 
            p.qr_code === code || 
            p.part_number === code
          );
          
          if (part) {
            setScanResult({
              type: 'part',
              data: part
            });
          } else {
            setError(`No machine or part found with code: ${code}`);
          }
        } catch (partError) {
          setError(`No machine or part found with code: ${code}`);
        }
      }
    } catch (error) {
      console.error('Scan lookup failed:', error);
      setError('Failed to lookup scanned code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    
    await handleScanResult(manualCode.trim());
  };

  const MachineResult = ({ machine }) => (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          Machine Found
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-green-700 font-medium">Serial Number</p>
            <p className="text-green-800">{machine.serial_number}</p>
          </div>
          <div>
            <p className="text-sm text-green-700 font-medium">Model</p>
            <p className="text-green-800">{machine.model}</p>
          </div>
          <div>
            <p className="text-sm text-green-700 font-medium">Manufacturer</p>
            <p className="text-green-800">{machine.manufacturer}</p>
          </div>
          <div>
            <p className="text-sm text-green-700 font-medium">Status</p>
            <Badge className={machine.status === 'active' ? 'bg-green-600' : 'bg-red-600'}>
              {machine.status.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        {machine.notes && (
          <div>
            <p className="text-sm text-green-700 font-medium">Notes</p>
            <p className="text-green-800 text-sm">{machine.notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => navigate(`/machine/${machine.id}`)}
          >
            <Wrench className="w-4 h-4 mr-2" />
            View Machine
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const PartResult = ({ part }) => (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <CheckCircle className="w-5 h-5" />
          Part Found
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-blue-700 font-medium">Part Number</p>
            <p className="text-blue-800">{part.part_number}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700 font-medium">Name</p>
            <p className="text-blue-800">{part.name}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700 font-medium">Category</p>
            <p className="text-blue-800">{part.category}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700 font-medium">Unit Cost</p>
            <p className="text-blue-800">${part.unit_cost}</p>
          </div>
        </div>
        
        {part.description && (
          <div>
            <p className="text-sm text-blue-700 font-medium">Description</p>
            <p className="text-blue-800 text-sm">{part.description}</p>
          </div>
        )}

        {part.supplier && (
          <div>
            <p className="text-sm text-blue-700 font-medium">Supplier</p>
            <p className="text-blue-800 text-sm">{part.supplier}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate('/dashboard')}
          >
            <Package className="w-4 h-4 mr-2" />
            View Inventory
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                data-testid="back-button"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-slate-800">QR/Barcode Scanner</h1>
                <p className="text-sm text-slate-600">Scan machines and parts</p>
              </div>
            </div>
            <QrCode className="w-6 h-6 text-slate-600" />
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <Tabs defaultValue="scanner" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scanner" data-testid="scanner-tab">
              <Camera className="w-4 h-4 mr-2" />
              Camera Scanner
            </TabsTrigger>
            <TabsTrigger value="manual" data-testid="manual-tab">
              <Search className="w-4 h-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR/Barcode Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scanner Controls */}
                <div className="flex gap-3">
                  {!scannerActive ? (
                    <Button
                      onClick={startQRScanner}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="start-scanner-button"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Start Scanner
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={stopQRScanner}
                      data-testid="stop-scanner-button"
                    >
                      Stop Scanner
                    </Button>
                  )}
                </div>

                {/* Scanner Display */}
                <div className="relative">
                  <div id="qr-reader" className="w-full"></div>
                  
                  {loading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-slate-600">Looking up code...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                {!scannerActive && !scanResult && !error && (
                  <div className="text-center py-8">
                    <QrCode className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Ready to Scan</h3>
                    <p className="text-slate-600">
                      Position the QR code or barcode within the camera frame
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Supports machine serial numbers, part numbers, and QR codes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Manual Code Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSearch} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Enter serial number, part number, or code..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="text-center"
                      data-testid="manual-code-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!manualCode.trim() || loading}
                    data-testid="manual-search-button"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Results */}
        <div className="space-y-4">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 font-medium">Not Found</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </CardContent>
            </Card>
          )}

          {scanResult && (
            <div data-testid="scan-result">
              {scanResult.type === 'machine' && <MachineResult machine={scanResult.data} />}
              {scanResult.type === 'part' && <PartResult part={scanResult.data} />}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                My Jobs
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/inventory')}
                className="flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                Inventory
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Scanner;