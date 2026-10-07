import Home from '../page';
import { account } from '../../lib/accounts';
import { redirect } from 'next/navigation';
export default async function AdminPage(){const current=await account();if(!current)redirect('/login');if(current.role!=='admin')redirect('/');return <Home adminPage/>;}
