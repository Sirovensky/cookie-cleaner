// Simulates the app's close-account transaction for a real Cookie Chain wallet (no signature needed).
const W=require('@solana/web3.js');
const RPC='https://rpc.cookiescan.io';const conn=new W.Connection(RPC,'confirmed');
const TOKEN=new W.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),TOKEN22=new W.PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
(async()=>{const owner=new W.PublicKey(process.argv[2]);
 const [a,b]=await Promise.all([conn.getParsedTokenAccountsByOwner(owner,{programId:TOKEN}),conn.getParsedTokenAccountsByOwner(owner,{programId:TOKEN22})]);
 const accts=[];for(const [prog,r] of [[TOKEN,a],[TOKEN22,b]])for(const it of r.value){const i=it.account.data.parsed.info;accts.push({pubkey:it.pubkey,program:prog,raw:i.tokenAmount.amount,frozen:i.state==='frozen',closeAuth:i.closeAuthority,lamports:it.account.lamports});}
 const empties=accts.filter(x=>x.raw==='0'&&!x.frozen&&(!x.closeAuth||x.closeAuth===owner.toBase58()));
 console.log('owner',owner.toBase58(),'token accounts',accts.length,'empty closable',empties.length,'rent',empties.reduce((s,x)=>s+x.lamports,0)/1e9,'COOK');
 const tx=new W.Transaction();for(const ac of empties.slice(0,12))tx.add(new W.TransactionInstruction({programId:ac.program,data:Uint8Array.from([9]),keys:[{pubkey:ac.pubkey,isSigner:false,isWritable:true},{pubkey:owner,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:false}]}));
 tx.feePayer=owner;tx.recentBlockhash=(await conn.getLatestBlockhash()).blockhash;
 const msg=tx.compileMessage();const vt=new W.VersionedTransaction(msg);
 const sim=await conn.simulateTransaction(vt,{sigVerify:false,replaceRecentBlockhash:true});
 console.log('sim err',JSON.stringify(sim.value.err),'CU',sim.value.unitsConsumed);console.log((sim.value.logs||[]).slice(-4).join('\n'));
})().catch(e=>{console.error(e);process.exit(1)});
