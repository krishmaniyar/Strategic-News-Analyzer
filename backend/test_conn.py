import asyncio, asyncpg

async def test():
    password = 'K&!8Yn6bk7Cz3Xr'
    configs = [
        ('aws-0-ap-south-1.pooler.supabase.com', 5432, 'postgres', 'postgres'),
        ('aws-0-ap-south-1.pooler.supabase.com', 6543, 'postgres', 'postgres'),
        ('aws-0-ap-south-1.pooler.supabase.com', 6543, 'postgres.mxvdrziwfsjnefvjmqop', 'postgres'),
        ('aws-0-ap-south-1.pooler.supabase.com', 5432, 'postgres.mxvdrziwfsjnefvjmqop', 'postgres'),
    ]
    for host, port, user, db in configs:
        try:
            conn = await asyncio.wait_for(
                asyncpg.connect(host=host, port=port, user=user, password=password, database=db, ssl='require'),
                timeout=10
            )
            print(f'CONNECTED: {user}@{host}:{port}')
            result = await conn.fetchval('SELECT 1')
            print(f'Query result: {result}')
            await conn.close()
        except Exception as e:
            print(f'FAILED user={user} port={port}: {type(e).__name__}: {str(e)[:150]}')

asyncio.run(test())
