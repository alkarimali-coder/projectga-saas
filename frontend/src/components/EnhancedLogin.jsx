// Enhanced Login Component with MFA Support
// Comprehensive authentication with security features

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  Key, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useSecurity } from '../contexts/SecurityContext';

const EnhancedLogin = () => {
  const {
    login,
    register,
    setupMFA,
    sendMFACode,
    verifyMFA,
    isLoading,
    error,
    mfaRequired,
    availableMfaMethods,
    mfaUserId,
    clearError
  } = useSecurity();

  // Login state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // Registration state
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    dataProcessingConsent: false,
    marketingConsent: false
  });

  // MFA state
  const [mfaState, setMfaState] = useState({
    selectedMethod: '',
    code: '',
    isSubmitting: false
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Clear error when component mounts or tab changes
  useEffect(() => {
    clearError();
  }, [activeTab, clearError]);

  // Password strength calculation
  useEffect(() => {
    if (registerData.password) {
      let strength = 0;
      if (registerData.password.length >= 8) strength += 25;
      if (/[A-Z]/.test(registerData.password)) strength += 25;
      if (/[a-z]/.test(registerData.password)) strength += 25;
      if (/[0-9!@#$%^&*(),.?":{}|<>]/.test(registerData.password)) strength += 25;
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [registerData.password]);

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    clearError();

    const result = await login(loginData.email, loginData.password);
    
    if (result.success) {
      // Login successful, user will be redirected by App component
    } else if (result.requiresMFA) {
      // MFA is required, component will show MFA form
      setMfaState({
        selectedMethod: availableMfaMethods[0] || '',
        code: '',
        isSubmitting: false
      });
    }
  };

  // Handle MFA submission
  const handleMFASubmit = async (e) => {
    e.preventDefault();
    setMfaState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Send MFA code if needed (for SMS/Email)
      if (mfaState.selectedMethod !== 'totp' && !mfaState.code) {
        const sendResult = await sendMFACode(mfaState.selectedMethod);
        if (sendResult.success) {
          alert('Verification code sent!');
        } else {
          throw new Error(sendResult.error);
        }
        return;
      }

      // Verify MFA code
      const verifyResult = await verifyMFA(mfaState.selectedMethod, mfaState.code);
      
      if (verifyResult.success) {
        // Complete login with MFA
        const loginResult = await login(
          loginData.email, 
          loginData.password, 
          mfaState.code, 
          mfaState.selectedMethod
        );
        
        if (!loginResult.success) {
          throw new Error(loginResult.error);
        }
      } else {
        throw new Error(verifyResult.error);
      }
    } catch (error) {
      console.error('MFA submission error:', error);
    } finally {
      setMfaState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    clearError();

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // Validate consent
    if (!registerData.dataProcessingConsent) {
      alert('You must consent to data processing to create an account');
      return;
    }

    const result = await register({
      email: registerData.email,
      password: registerData.password,
      first_name: registerData.firstName,
      last_name: registerData.lastName,
      phone: registerData.phone,
      data_processing_consent: registerData.dataProcessingConsent,
      marketing_consent: registerData.marketingConsent
    });

    if (result.success) {
      alert('Registration successful! Please log in.');
      setActiveTab('login');
      // Reset form
      setRegisterData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: '',
        dataProcessingConsent: false,
        marketingConsent: false
      });
    }
  };

  // Get password strength color
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'bg-red-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get MFA method icon
  const getMFAIcon = (method) => {
    switch (method) {
      case 'totp': return <Key className="w-4 h-4" />;
      case 'sms': return <Smartphone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  // If MFA is required, show MFA form
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Multi-Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMFASubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* MFA Method Selection */}
              <div className="space-y-2">
                <Label>Select verification method:</Label>
                <div className="grid gap-2">
                  {availableMfaMethods.map((method) => (
                    <Button
                      key={method}
                      type="button"
                      variant={mfaState.selectedMethod === method ? "default" : "outline"}
                      onClick={() => setMfaState(prev => ({ ...prev, selectedMethod: method }))}
                      className="justify-start"
                    >
                      {getMFAIcon(method)}
                      <span className="ml-2 capitalize">
                        {method === 'totp' ? 'Authenticator App' : method.toUpperCase()}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* MFA Code Input */}
              {mfaState.selectedMethod && (
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">
                    {mfaState.selectedMethod === 'totp' 
                      ? 'Enter code from your authenticator app'
                      : `Enter code sent via ${mfaState.selectedMethod.toUpperCase()}`
                    }
                  </Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    placeholder="000000"
                    value={mfaState.code}
                    onChange={(e) => setMfaState(prev => ({ 
                      ...prev, 
                      code: e.target.value.replace(/\D/g, '').slice(0, 6)
                    }))}
                    maxLength="6"
                    className="text-center text-lg tracking-widest"
                  />
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={mfaState.isSubmitting || !mfaState.selectedMethod}
              >
                {mfaState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mfaState.code ? 'Verifying...' : 'Sending Code...'}
                  </>
                ) : (
                  mfaState.code ? 'Verify Code' : 'Send Code'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main login/registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            COAM SaaS Platform
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={loginData.rememberMe}
                    onChange={(e) => setLoginData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="rememberMe" className="text-sm">Remember me</Label>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Registration Tab */}
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={registerData.firstName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regEmail">Email</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="regPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {registerData.password && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Password Strength</span>
                        <span>{passwordStrength}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                  {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                {/* Consent Checkboxes */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-start space-x-2">
                    <input
                      id="dataConsent"
                      type="checkbox"
                      checked={registerData.dataProcessingConsent}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, dataProcessingConsent: e.target.checked }))}
                      className="rounded mt-1"
                      required
                    />
                    <Label htmlFor="dataConsent" className="text-sm leading-5">
                      I consent to the processing of my personal data for account creation and service provision.
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <input
                      id="marketingConsent"
                      type="checkbox"
                      checked={registerData.marketingConsent}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, marketingConsent: e.target.checked }))}
                      className="rounded mt-1"
                    />
                    <Label htmlFor="marketingConsent" className="text-sm leading-5">
                      I consent to receiving marketing communications and product updates.
                    </Label>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Security Badge */}
          <div className="mt-6 text-center">
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Enterprise Security Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedLogin;