describe('Code Wrapping Regex Logic', () => {
  describe('JavaScript Function Detection', () => {
    test('should detect regular function declarations', () => {
      const code = `function twoSum(nums, target) {
        return [0, 1];
      }`;
      
      const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('twoSum');
    });

    test('should detect arrow function assignments', () => {
      const code = `const twoSum = (nums, target) => {
        return [0, 1];
      }`;
      
      const funcMatch = code.match(/const\s+(\w+)\s*=\s*(?:async\s*)?\s*\([^)]*\)\s*=>/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('twoSum');
    });

    test('should detect async function declarations', () => {
      const code = `async function fetchData() {
        return await getData();
      }`;
      
      const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('fetchData');
    });

    test('should detect class definitions', () => {
      const code = `class ListNode {
        constructor(val) {
          this.val = val;
        }
      }`;
      
      const classMatch = code.match(/class\s+(\w+)/);
      expect(classMatch).toBeTruthy();
      expect(classMatch[1]).toBe('ListNode');
    });
  });

  describe('Python Function Detection', () => {
    test('should detect function definitions', () => {
      const code = `def two_sum(nums, target):
        return [0, 1]`;
      
      const funcMatch = code.match(/def\s+(\w+)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('two_sum');
    });

    test('should detect class definitions', () => {
      const code = `class Solution:
        def two_sum(self, nums, target):
            return [0, 1]`;
      
      const classMatch = code.match(/class\s+(\w+)/);
      expect(classMatch).toBeTruthy();
      expect(classMatch[1]).toBe('Solution');
    });
  });

  describe('C++ Function Detection', () => {
    test('should detect function with return type', () => {
      const code = `vector<int> twoSum(vector<int>& nums, int target) {
        return {0, 1};
      }`;
      
      const funcMatch = code.match(/(?:int|string|vector<\w+>|bool|double|float|long|char)\s+(\w+)\s*\([^)]*\)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('twoSum');
    });

    test('should detect main function', () => {
      const code = `int main() {
        cout << "Hello World" << endl;
        return 0;
      }`;
      
      const funcMatch = code.match(/(?:int|string|vector<\w+>|bool|double|float|long|char)\s+(\w+)\s*\([^)]*\)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('main');
    });
  });

  describe('Java Function Detection', () => {
    test('should detect public method', () => {
      const code = `public int[] twoSum(int[] nums, int target) {
        return new int[]{0, 1};
      }`;
      
      const funcMatch = code.match(/(?:public\s+)?(?:static\s+)?(?:int\[\]|\w+)\s+(\w+)\s*\([^)]*\)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('twoSum');
    });

    test('should detect static method', () => {
      const code = `public static void main(String[] args) {
        System.out.println("Hello");
      }`;
      
      const funcMatch = code.match(/(?:public\s+)?(?:static\s+)?(?:\w+)\s+(\w+)\s*\([^)]*\)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('main');
    });
  });

  describe('Code Wrapping Logic', () => {
    test('should generate JavaScript function wrapper', () => {
      const code = `function twoSum(nums, target) {
        return [0, 1];
      }`;
      
      const testCase = {
        input: { nums: [2, 7, 11, 15], target: 9 },
        expected: [0, 1]
      };

      const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const args = Object.values(testCase.input);
        const firstArgVal = JSON.stringify(args[0]);
        const restArgs = args.slice(1).map((a) => JSON.stringify(a)).join(", ");
        const callArgs = args.length > 1 ? `__arg0, ${restArgs}` : "__arg0";
        
        const wrapped = `${code}
const __arg0 = ${firstArgVal};
const __r = ${funcName}(${callArgs});
console.log(JSON.stringify(__r !== undefined ? __r : __arg0));`;

        expect(wrapped).toContain('twoSum(__arg0, 9)');
        expect(wrapped).toContain('console.log(JSON.stringify(__r !== undefined ? __r : __arg0))');
      }
    });

    test('should generate Python function wrapper', () => {
      const code = `def two_sum(nums, target):
    return [0, 1]`;
      
      const testCase = {
        input: { nums: [2, 7, 11, 15], target: 9 },
        expected: [0, 1]
      };

      const funcMatch = code.match(/def\s+(\w+)/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const args = Object.values(testCase.input);
        const firstArgVal = JSON.stringify(args[0]);
        const restArgs = args.slice(1).map((a) => JSON.stringify(a)).join(", ");
        const callArgs = args.length > 1 ? `__arg0, ${restArgs}` : "__arg0";
        
        const wrapped = `import json
${code}
__arg0 = ${firstArgVal}
__r = ${funcName}(${callArgs})
print(json.dumps(__r if __r is not None else __arg0))`;

        expect(wrapped).toContain('two_sum(__arg0, 9)');
        expect(wrapped).toContain('print(json.dumps(__r if __r is not None else __arg0))');
      }
    });

    test('should handle class-based test cases', () => {
      const code = `class MyQueue {
        constructor() {
          this.stack1 = [];
        }
        
        push(x) {
          this.stack1.push(x);
        }
      }`;
      
      const testCase = {
        input: {
          operations: ["MyQueue", "push", "push"],
          values: [[], [1], [2]]
        },
        expected: [null, null, null]
      };

      const classMatch = code.match(/class\s+(\w+)/);
      expect(classMatch).toBeTruthy();
      expect(classMatch[1]).toBe('MyQueue');

      const { operations, values } = testCase.input;
      if (operations && values) {
        const cls = operations[0];
        const wrapped = `${code}
const __ops=${JSON.stringify(operations)},__vals=${JSON.stringify(values)},__out=[];
let __o=null;
for(let i=0;i<__ops.length;i++){
  if(i===0){__o=new ${cls}(...__vals[i]);__out.push(null);}
  else{const r=__o[__ops[i]](...__vals[i]);__out.push(r===undefined?null:r);}
}
console.log(JSON.stringify(__out));`;

        expect(wrapped).toContain('new MyQueue');
        expect(wrapped).toContain('__o[__ops[i]](...__vals[i])');
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty code', () => {
      const code = '';
      
      const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
      expect(funcMatch).toBeNull();
    });

    test('should handle malformed function syntax', () => {
      const code = `function (nums, target) {
        return [0, 1];
      }`;
      
      const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
      expect(funcMatch).toBeNull();
    });

    test('should handle function names with underscores and numbers', () => {
      const code = `function solve_problem_1(input) {
        return input * 2;
      }`;
      
      const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('solve_problem_1');
    });

    test('should detect first function in nested definitions', () => {
      const code = `function outer() {
        function inner() {
          return 42;
        }
        return inner();
      }`;
      
      const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('outer'); // Should match the first function
    });
  });

  describe('Language-specific Patterns', () => {
    test('should detect Go functions', () => {
      const code = `func twoSum(nums []int, target int) []int {
        return []int{0, 1}
      }`;
      
      const funcMatch = code.match(/func\s+(\w+)\s*\([^)]*\)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('twoSum');
    });

    test('should detect Rust functions', () => {
      const code = `fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        vec![0, 1]
      }`;
      
      const funcMatch = code.match(/fn\s+(\w+)\s*\([^)]*\)/);
      expect(funcMatch).toBeTruthy();
      expect(funcMatch[1]).toBe('two_sum');
    });
  });
});