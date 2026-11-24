"""Author: Sandeep Belgavi. Stale definition and authorization-scope tests."""
import unittest
from example import *
class Tests(unittest.TestCase):
 def test_same(self):self.assertEqual(admit(fixture(),fixture()),'ready')
 def test_semantic_change(self):self.assertEqual(admit(fixture(),fixture('milliseconds')),'replan')
 def test_removed(self):self.assertEqual(admit(fixture(),None),'tool_removed')
 def test_scope(self):
  c=Cache();c.put('server','principal-A',{},[fixture()],0,10);self.assertIsNone(c.get('server','principal-B',{},1))
 def test_expiry(self):
  c=Cache();c.put('server','p',{},[fixture()],0,10);self.assertIsNotNone(c.get('server','p',{},9));self.assertIsNone(c.get('server','p',{},10))
 def test_cursor(self):
  c=Cache();c.put('server','p',{'cursor':'a'},[],0,10);self.assertIsNone(c.get('server','p',{'cursor':'b'},1))
 def test_notification(self):
  c=Cache();c.put('server','p',{},[],0,10);c.invalidate('server');self.assertIsNone(c.get('server','p',{},1))
if __name__=='__main__':unittest.main()
