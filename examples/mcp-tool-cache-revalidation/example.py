"""Author: Sandeep Belgavi. Application cache policy, not an MCP SDK client."""
import hashlib,json
def fingerprint(tool):
 fields=('name','description','inputSchema','annotations')
 return hashlib.sha256(json.dumps({k:tool.get(k) for k in fields},sort_keys=True,separators=(',',':')).encode()).hexdigest()
def admit(shown,live):
 if live is None:return 'tool_removed'
 return 'ready' if fingerprint(shown)==fingerprint(live) else 'replan'
class Cache:
 def __init__(self):self.entries={}
 def put(self,server,principal,params,tools,now,ttl):
  if ttl<0:ttl=0
  self.entries[(server,principal,json.dumps(params,sort_keys=True))]=(tools,now+ttl)
 def get(self,server,principal,params,now):
  item=self.entries.get((server,principal,json.dumps(params,sort_keys=True)))
  return item[0] if item and now<item[1] else None
 def invalidate(self,server):
  self.entries={k:v for k,v in self.entries.items() if k[0]!=server}
def fixture(unit='seconds'):
 return {'name':'scan_artifact','description':'timeout is in '+unit,'inputSchema':{'type':'object','properties':{'timeout':{'type':'integer'}}}}
def demo():return {'unchanged':admit(fixture(),fixture()),'unit_changed':admit(fixture(),fixture('milliseconds')),'removed':admit(fixture(),None)}
if __name__=='__main__':print(json.dumps(demo(),sort_keys=True))
