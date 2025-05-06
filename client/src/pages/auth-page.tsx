import { useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
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

const registerSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name is required.",
  }),
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
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

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
                                placeholder="Enter your full name"
                                {...field}
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
                            <FormControl>
                              <Input
                                placeholder="Enter your mobile number"
                                {...field}
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
                        name="email"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter your email address"
                                {...field}
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
                        name="username"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>User ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Choose a username"
                                {...field}
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
                        name="password"
                        render={({ field }) => (
                          <FormItem className="form-field">
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Choose a password"
                                {...field}
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
          
          <div className="relative z-10 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-inner">
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-300 to-amber-200 drop-shadow-sm">Welcome to </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white font-bold drop-shadow-sm">Buss</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-secondary-300 to-secondary-600 font-extrabold drop-shadow-sm">Note</span>
            </h1>
            <p className="mb-10 text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white max-w-md font-medium drop-shadow-sm">Complete sales invoice management system for your business</p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4 group">
                <div className="bg-primary-800/50 group-hover:bg-primary-700/60 p-3 rounded-xl shadow-lg transition-all duration-300 border border-white/10">
                  <FileText className="h-6 w-6 text-secondary-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white group-hover:from-secondary-100 group-hover:to-secondary-300 transition-all duration-300 drop-shadow-sm">Invoice Management</h3>
                  <p className="text-white group-hover:text-white transition-colors duration-300">Create and manage sales invoices with ease</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 group">
                <div className="bg-primary-800/50 group-hover:bg-primary-700/60 p-3 rounded-xl shadow-lg transition-all duration-300 border border-white/10">
                  <LucideUsers className="h-6 w-6 text-secondary-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white group-hover:from-secondary-100 group-hover:to-secondary-300 transition-all duration-300 drop-shadow-sm">Party Master</h3>
                  <p className="text-white group-hover:text-white transition-colors duration-300">Manage all your clients and customers in one place</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 group">
                <div className="bg-primary-800/50 group-hover:bg-primary-700/60 p-3 rounded-xl shadow-lg transition-all duration-300 border border-white/10">
                  <CreditCard className="h-6 w-6 text-secondary-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white group-hover:from-secondary-100 group-hover:to-secondary-300 transition-all duration-300 drop-shadow-sm">Financial Reports</h3>
                  <p className="text-white group-hover:text-white transition-colors duration-300">Track outstanding dues, closed bills and sales analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
