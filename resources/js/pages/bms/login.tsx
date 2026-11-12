import { FormErrors } from '@/components/bms/controls';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { Building2 } from 'lucide-react';

export default function Login({ demoLoginAvailable, status }: { demoLoginAvailable: boolean; status?: string }) {
    const form = useForm<{ email: string; password: string; remember: boolean }>({ email: '', password: '', remember: false });
    const demoForm = useForm({});
    return (
        <div className="login-screen">
            <Head title="Sign in" />
            <aside className="login-intro">
                <div className="brand">
                    <span className="brand-name">
                        Iotnect BMS
                        <span className="brand-square" />
                    </span>
                    <span className="brand-caption">BUILDING MANAGEMENT</span>
                </div>
                <div>
                    <Building2 size={38} strokeWidth={1.3} aria-hidden="true" />
                    <h2 style={{ marginTop: 26 }}>
                        Your building.
                        <br />
                        One clear view.
                    </h2>
                    <p>From the first alarm to the last kilowatt-hour. Bring equipment, energy and everyday operations into one workspace.</p>
                </div>
                <footer>Independent BMS development workspace · Kuala Lumpur</footer>
            </aside>
            <main className="login-content">
                <div className="login-box">
                    <h1>Welcome to your workspace</h1>
                    <p>Sign in to monitor your building and manage daily operations.</p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/login', { onFinish: () => form.reset('password') });
                        }}
                    >
                        <div className="field">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="username"
                                required
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                            />
                        </div>
                        <div className="field">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                            />
                        </div>
                        <div className="row-actions">
                            <Checkbox id="remember" checked={form.data.remember} onCheckedChange={(checked) => form.setData('remember', !!checked)} />
                            <Label htmlFor="remember">Remember me</Label>
                            <Link className="text-link" style={{ marginLeft: 'auto' }} href="/forgot-password">
                                Forgot password?
                            </Link>
                        </div>
                        <FormErrors errors={form.errors} />
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>
                    {status && (
                        <p role="status" className="notice">
                            {status}
                        </p>
                    )}
                    {demoLoginAvailable && (
                        <div className="demo-entry">
                            <p>Developing locally? Open the sample building with simulated equipment and 30 days of trend data.</p>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    demoForm.post('/demo-login');
                                }}
                                style={{ marginTop: 0 }}
                            >
                                <Button type="submit" variant="outline" disabled={demoForm.processing}>
                                    {demoForm.processing ? 'Opening…' : 'Open demo workspace'}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
