import { test, expect } from 'vitest';
import { GroupAuthorPie } from '../../src/main/pie';


test('Can create GroupAuthorPie', () => {
    const input = {
        "Backend": {
            "Bob": 10,
            "Alice": 5
        },
        "Frontend": {
            "Bob": 4,
            "Charlie": 8
        }
    }

    let pie = new GroupAuthorPie(input);
    let exported = pie.export();
    expect(exported).toStrictEqual(input);
});

test('Can filter GroupAuthorPie by authors', () => {
     const input = {
        "Backend": {
            "Bob": 10,
            "Alice": 5
        },
        "Frontend": {
            "Bob": 4,
            "Charlie": 8
        }
    }

    let pie = new GroupAuthorPie(input);
    pie.filterAuthors(['Alice', 'Charlie']);
    let exported = pie.export();    
    expect(exported).toStrictEqual({
        "Backend": {            
            "Alice": 5
        },
        "Frontend": {               
            "Charlie": 8
        }
    });
});

test('Can map authors in GroupAuthorPie', () => {
        const input = {
        "Backend": {
            "Bob": 10,
            "Alice": 5
        },
        "Frontend": {
            "Bob": 4,
            "Charlie": 8
        }
    }

    let pie = new GroupAuthorPie(input);
    pie.mapAuthors({'Alice': 'AliceTheGreat', 'Charlie': 'Charlie2'});
    let exported = pie.export();    
    expect(exported).toStrictEqual({
        "Backend": {
            "Bob": 10,
            "AliceTheGreat": 5
        },
        "Frontend": {
            "Bob": 4,
            "Charlie2": 8
        }
    });
});


test('Can add Pies', () => {
     const input1 = {
        "Backend": {
            "Bob": 10,
            "Alice": 5
        },
        "Frontend": {
            "Bob": 4,
            "Charlie": 8
        }
    }

    const input2 = {
        "Backend": {
            "Bob": 3,
            "Eduardo": 6
        },
        "Communication": {
            "Dave": 7
        }
    }

    let pie = new GroupAuthorPie(input1);
    pie.addPie(new GroupAuthorPie(input2));
    let exported = pie.export();    
    expect(exported).toStrictEqual({
      "Backend": {
            "Bob": 13,
            "Alice": 5,
            "Eduardo": 6
        },        
        "Frontend": {
            "Bob": 4,
            "Charlie": 8
        },        
        "Communication": {
            "Dave": 7
        }
    });
});