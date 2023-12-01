---
title: "Ways to initialize String in Rust"
description: "Ways to initialize String in Rust"
publishDate: "10 Oct 2023"
tags: ["rust"]
---

## Code

```

fn main() {
    let hello_world = String::from("I 💖 rust");
    println!("{hello_world}");

    let another_world = String::from_str("Hello my 💖!!!!").unwrap();
    println!("{another_world}");

    let sparkle_heart =  vec![240, 159, 146, 150];
    let sparkle_heart = String::from_utf8(sparkle_heart).unwrap();
    println!("{sparkle_heart}");

    let mut sparkle_heart = String::new();
    sparkle_heart.push_str("Hello world!!!");
    println!("{sparkle_heart}");

}

```
