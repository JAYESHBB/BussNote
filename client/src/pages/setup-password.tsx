import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

export default function SetupPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"verify" | "password">("verify");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  
  const [verifyData, setVerifyData] = useState({
    username: "",
    email: "",
    mobile: ""
  });

  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
      checks: {
        minLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial
      }
    };
  };

  const passwordValidation = validatePassword(passwordData.password);
  const passwordsMatch = passwordData.password === passwordData.confirmPassword && passwordData.confirmPassword.length > 0;

  const handleVerifyUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/verify-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verifyData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "User verification failed");
      }

      if (result.hasPassword) {
        toast({
          title: "Error",
          description: "This user already has a password set. Please use the regular login.",
          variant: "destructive"
        });
        return;
      }

      setUserId(result.userId);
      setStep("password");
      toast({
        title: "Success",
        description: "User verified! Please set your password.",
      });

    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Please check your details and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordValidation.isValid) {
      toast({
        title: "Invalid Password",
        description: "Please ensure your password meets all requirements.",
        variant: "destructive"
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/setup-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          password: passwordData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Password setup failed");
      }

      toast({
        title: "Success",
        description: "Password set successfully! You can now login.",
      });

      // Redirect to login page
      setLocation("/auth");

    } catch (error: any) {
      toast({
        title: "Password Setup Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {step === "verify" ? "First Time Setup" : "Set Your Password"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === "verify" 
              ? "Please verify your details to continue"
              : "Create a secure password for your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "verify" ? (
            <form onSubmit={handleVerifyUser} className="space-y-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={verifyData.username}
                  onChange={(e) => setVerifyData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={verifyData.email}
                  onChange={(e) => setVerifyData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  value={verifyData.mobile}
                  onChange={(e) => setVerifyData(prev => ({ ...prev, mobile: e.target.value }))}
                  placeholder="Enter your mobile number"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Verifying..." : "Verify & Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {passwordData.password && (
                  <div className="mt-2 space-y-1 text-sm">
                    <div className={`flex items-center ${passwordValidation.checks.minLength ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.minLength ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                      At least 8 characters
                    </div>
                    <div className={`flex items-center ${passwordValidation.checks.hasUpper ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.hasUpper ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                      One uppercase letter
                    </div>
                    <div className={`flex items-center ${passwordValidation.checks.hasLower ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.hasLower ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                      One lowercase letter
                    </div>
                    <div className={`flex items-center ${passwordValidation.checks.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.hasNumber ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                      One number
                    </div>
                    <div className={`flex items-center ${passwordValidation.checks.hasSpecial ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.hasSpecial ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                      One special character
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm your password"
                    required
                    className={`pr-10 ${
                      passwordData.confirmPassword && passwordsMatch
                        ? "border-green-500 focus:border-green-500"
                        : passwordData.confirmPassword && !passwordsMatch
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {passwordData.confirmPassword && (
                  <div className={`mt-1 text-sm flex items-center ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting || !passwordValidation.isValid || !passwordsMatch}
              >
                {isSubmitting ? "Setting Password..." : "Set Password & Login"}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => setLocation("/auth")}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Already have a password? Login here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}