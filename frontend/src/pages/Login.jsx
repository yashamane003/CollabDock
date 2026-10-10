import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userInfo', JSON.stringify(data));
                navigate('/dashboard');
            } else {
                setError(data.message || 'Login failed. Please verify credentials.');
            }
        } catch (err) {
            setError('Unable to reach the server. Make sure backend is running on port 5000.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoFill = (fillEmail, fillPass) => {
        setEmail(fillEmail);
        setPassword(fillPass);
        setError('');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-3">
                    <MessageSquare className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Welcome to PulseChat
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Sign in to join real-time channels and private conversations
                </p>
            </div>

            <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-2xl border border-gray-100 dark:border-gray-800">
                    {error && (
                        <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 p-3 rounded-xl text-xs text-red-600 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    placeholder="alice@test.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </button>
                    </form>

                    <div className="mt-5 text-center text-xs text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                            Create account
                        </Link>
                    </div>

                    {/* Quick Dev Fill */}
                    <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-gray-400 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Quick Demo Accounts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleAutoFill('alice@test.com', 'password123')}
                                className="py-1.5 px-2 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                Login as Alice
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAutoFill('bob@test.com', 'password123')}
                                className="py-1.5 px-2 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                Login as Bob
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
