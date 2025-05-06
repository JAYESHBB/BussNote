import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileText, CreditCard, LucideUsers } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

// Function to capitalize each word in a string
function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const registerSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name is required.",
  }).transform(capitalizeWords),
  address: z.string().optional(),
  mobile: z.string().regex(/^\+?[0-9\s-]{10,15}$/, {
    message: "Please enter a valid mobile number.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string()
    .min(8, {
      message: "Password must be at least 8 characters.",
    })
    .max(16, {
      message: "Password must not exceed 16 characters.",
    })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/, {
      message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(false);
  const [mobileValid, setMobileValid] = useState<boolean | null>(null);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });
  
  const validateMobile = (mobile: string) => {
    const isValid = /^\+?[0-9\s-]{10,15}$/.test(mobile);
    setMobileValid(isValid);
    return isValid;
  };

  const validateEmail = (email: string) => {
    const isValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    setEmailValid(isValid);
    return isValid;
  };
  
  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password)
    };
    
    setPasswordChecks(checks);
    setPasswordStrength(true);
  };

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      address: "",
      mobile: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    await loginMutation.mutateAsync(values);
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    const { confirmPassword, ...registerData } = values;
    await registerMutation.mutateAsync(registerData);
  };

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 colorful-bg-pattern">
      <div className="w-full max-w-5xl grid gap-6 md:grid-cols-2">
        <div className="flex flex-col justify-center">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 p-1 bg-primary-50/50 backdrop-blur-sm">
              <TabsTrigger value="login" className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-md transition-all duration-300">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-md transition-all duration-300">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader className="colorful-header">
                  <CardTitle className="text-2xl text-white">Login</CardTitle>
                  <CardDescription className="text-white/80">
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 form-animate-in">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your username"
                                {...field}
                                disabled={loginMutation.isPending}
                                className="form-input"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                {...field}
                                disabled={loginMutation.isPending}
                                className="form-input"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900 text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 animate-in fade-in duration-500 delay-500 rounded-md relative overflow-hidden group" 
                        disabled={loginMutation.isPending}
                      >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                        <span className="relative z-10 font-medium">{loginMutation.isPending ? "Logging in..." : "Login"}</span>
                      </Button>
                      <div className="text-center mt-4 text-sm text-muted-foreground">
                        Not yet registered? <a 
                          className="text-primary hover:text-primary-700 font-medium cursor-pointer relative group" 
                          onClick={() => {
                            const element = document.querySelector('[data-state="inactive"][data-value="register"]') as HTMLElement;
                            element?.click();
                          }}
                        >
                          Click here to register
                          <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                        </a>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader className="colorful-header">
                  <CardTitle className="text-2xl text-white">Create Account</CardTitle>
                  <CardDescription className="text-white/80">
                    Register to get started with BussNote
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 form-animate-in">
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your proper full name"
                                {...field}
                                value={field.value}
                                onChange={(e) => {
                                  // Immediately apply capitalization when typing
                                  const value = e.target.value;
                                  field.onChange(capitalizeWords(value));
                                }}
                                disabled={registerMutation.isPending}
                                className="form-input"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your address"
                                {...field}
                                value={field.value}
                                onChange={(e) => {
                                  // Immediately apply capitalization when typing
                                  const value = e.target.value;
                                  field.onChange(capitalizeWords(value));
                                }}
                                disabled={registerMutation.isPending}
                                className="form-input"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Mobile</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  placeholder="Enter your mobile number"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    validateMobile(e.target.value);
                                  }}
                                  disabled={registerMutation.isPending}
                                  className="form-input pr-8"
                                />
                              </FormControl>
                              {mobileValid === false && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {mobileValid === true && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <FormMessage />
                            {mobileValid === false && (
                              <p className="text-xs text-red-500 mt-1">Please enter a valid mobile number (10-15 digits)</p>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Email</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter your email address"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    validateEmail(e.target.value);
                                  }}
                                  disabled={registerMutation.isPending}
                                  className="form-input pr-8"
                                />
                              </FormControl>
                              {emailValid === false && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {emailValid === true && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <FormMessage />
                            {emailValid === false && (
                              <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>User ID</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  placeholder="Choose a unique username"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Reset username availability when typing
                                    setUsernameAvailable(null);
                                  }}
                                  onBlur={async (e) => {
                                    field.onBlur();
                                    const value = e.target.value;
                                    if (value.length >= 3) {
                                      setUsernameChecking(true);
                                      try {
                                        const response = await apiRequest('GET', `/api/check-username?username=${encodeURIComponent(value)}`);
                                        const data = await response.json();
                                        setUsernameAvailable(data.available);
                                      } catch (error) {
                                        console.error('Error checking username:', error);
                                        setUsernameAvailable(null);
                                      } finally {
                                        setUsernameChecking(false);
                                      }
                                    }
                                  }}
                                  disabled={registerMutation.isPending}
                                  className="form-input pr-8"
                                />
                              </FormControl>
                              {usernameChecking && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <div className="h-4 w-4 rounded-full border-2 border-b-transparent border-primary animate-spin"></div>
                                </div>
                              )}
                              {!usernameChecking && usernameAvailable === false && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {!usernameChecking && usernameAvailable === true && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <FormMessage />
                            {!usernameChecking && usernameAvailable === false && (
                              <p className="text-xs text-red-500 mt-1">This username is already taken. Please choose another.</p>
                            )}
                            {!usernameChecking && usernameAvailable === true && (
                              <p className="text-xs text-green-500 mt-1">Username is available!</p>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="password"
                                  placeholder="Choose a strong mixed content password"
                                  {...field}
                                  disabled={registerMutation.isPending}
                                  className="form-input"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    validatePassword(e.target.value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                            {passwordStrength && (
                              <div className="text-xs mt-1 space-y-1">
                                <div className="flex items-center">
                                  <div className={`h-1 flex-1 rounded-full ${passwordChecks.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <div className={`h-1 flex-1 mx-1 rounded-full ${passwordChecks.hasUppercase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <div className={`h-1 flex-1 mx-1 rounded-full ${passwordChecks.hasLowercase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <div className={`h-1 flex-1 rounded-full ${passwordChecks.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <div className={`h-1 flex-1 ml-1 rounded-full ${passwordChecks.hasSpecial ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                </div>
                                <ul className="space-y-1 pl-5 list-disc">
                                  <li className={passwordChecks.length >= 8 ? 'text-green-500' : 'text-gray-500'}>At least 8 characters</li>
                                  <li className={passwordChecks.hasUppercase ? 'text-green-500' : 'text-gray-500'}>At least one uppercase letter</li>
                                  <li className={passwordChecks.hasLowercase ? 'text-green-500' : 'text-gray-500'}>At least one lowercase letter</li>
                                  <li className={passwordChecks.hasNumber ? 'text-green-500' : 'text-gray-500'}>At least one number</li>
                                  <li className={passwordChecks.hasSpecial ? 'text-green-500' : 'text-gray-500'}>At least one special character</li>
                                </ul>
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm your password"
                                {...field}
                                disabled={registerMutation.isPending}
                                className="form-input"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-secondary-500 to-secondary-700 hover:from-secondary-600 hover:to-secondary-800 text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 animate-in fade-in duration-500 delay-700 rounded-md relative overflow-hidden group" 
                        disabled={registerMutation.isPending}
                      >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                        <span className="relative z-10 font-medium">{registerMutation.isPending ? "Creating account..." : "Register"}</span>
                      </Button>
                      <div className="text-center mt-4 text-sm text-muted-foreground">
                        Already registered? <a 
                          className="text-primary hover:text-primary-700 font-medium cursor-pointer relative group" 
                          onClick={() => {
                            const element = document.querySelector('[data-state="inactive"][data-value="login"]') as HTMLElement;
                            element?.click();
                          }}
                        >
                          Click here for login
                          <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                        </a>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex flex-col justify-center p-8 bg-gradient-to-br from-primary-800 to-primary-950 text-white rounded-lg hidden md:flex shadow-xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-400/20 rounded-full -mt-20 -mr-20 blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary-400/30 rounded-full -mb-10 -ml-10 blur-xl pointer-events-none"></div>
          
          <div className="relative z-10 p-8 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 shadow-inner">
            <h1 className="text-4xl font-bold mb-3">
              <span className="text-white drop-shadow-md">Welcome to </span>
              <span className="text-white font-bold drop-shadow-md">Buss</span>
              <span className="text-secondary-300 font-extrabold drop-shadow-md">Note</span>
            </h1>
            <p className="mb-10 text-lg text-white max-w-md font-medium drop-shadow-md">Complete sales invoice management system for your business</p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4 group">
                <div className="bg-black/40 group-hover:bg-secondary-900/50 p-3 rounded-xl shadow-lg transition-all duration-300 border border-white/20 backdrop-blur-sm">
                  <FileText className="h-6 w-6 text-secondary-200" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white group-hover:text-secondary-200 transition-all duration-300 drop-shadow-md">Invoice Management</h3>
                  <p className="text-white/90 group-hover:text-white transition-colors duration-300">Create and manage sales invoices with ease</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 group">
                <div className="bg-black/40 group-hover:bg-secondary-900/50 p-3 rounded-xl shadow-lg transition-all duration-300 border border-white/20 backdrop-blur-sm">
                  <LucideUsers className="h-6 w-6 text-secondary-200" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white group-hover:text-secondary-200 transition-all duration-300 drop-shadow-md">Party Master</h3>
                  <p className="text-white/90 group-hover:text-white transition-colors duration-300">Manage all your clients and customers in one place</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 group">
                <div className="bg-black/40 group-hover:bg-secondary-900/50 p-3 rounded-xl shadow-lg transition-all duration-300 border border-white/20 backdrop-blur-sm">
                  <CreditCard className="h-6 w-6 text-secondary-200" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white group-hover:text-secondary-200 transition-all duration-300 drop-shadow-md">Financial Reports</h3>
                  <p className="text-white/90 group-hover:text-white transition-colors duration-300">Track outstanding dues, closed bills and sales analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
