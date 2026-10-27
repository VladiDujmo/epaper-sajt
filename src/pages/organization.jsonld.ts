import type { APIRoute } from 'astro';
import {organization} from '../data/site';
export const GET:APIRoute=()=>new Response(JSON.stringify({'@context':'https://schema.org',...organization},null,2),{headers:{'Content-Type':'application/ld+json; charset=utf-8'}});
