// Static PE/pclntab disassembler. Build beside the Go toolchain's x86asm package.
package main

import (
	"bytes"
	"debug/pe"
	"encoding/binary"
	"fmt"
	"os"
	"regexp"
	"strconv"

	"./x86asm"
)

func main() {
	if len(os.Args) < 3 { panic("usage: disassemble-pe FILE FUNCTION_REGEX") }
	b,err:=os.ReadFile(os.Args[1]); if err!=nil {panic(err)}
	m,err:=pe.Open(os.Args[1]); if err!=nil {panic(err)}; defer m.Close()
	base:=m.OptionalHeader.(*pe.OptionalHeader64).ImageBase
	resolve:=func(a uint64) int {for _,s:=range m.Sections {v:=base+uint64(s.VirtualAddress);if s.Offset!=0&&a>=v&&a<v+uint64(s.Size){return int(uint64(s.Offset)+a-v)}};return -1}
	p:=bytes.Index(b,[]byte{0xf1,0xff,0xff,0xff,0,0,1,8});if p<0{panic("pclntab missing")}
	u64:=func(o int)uint64{return binary.LittleEndian.Uint64(b[p+o:])}
	u32:=func(o int)uint32{return binary.LittleEndian.Uint32(b[p+o:])}
	text:=u64(24);if text==0{for _,s:=range m.Sections{if s.Name==".text"{text=base+uint64(s.VirtualAddress)}}}
	names,table:=int(u64(32)),int(u64(64))
	type fun struct{name string;start,end uint64}
	ff:=make([]fun,int(u64(8)));by:=map[uint64]string{}
	for i:=range ff{e:=table+i*8;f:=table+int(u32(e+4));n:=p+names+int(u32(f+4));stop:=n;for b[stop]!=0{stop++};ff[i]=fun{string(b[n:stop]),text+uint64(u32(e)),text+uint64(u32(e+8))};by[ff[i].start]=ff[i].name}
	preview:=func(a uint64)string{o:=resolve(a);if o<0{return ""};end:=o;for end<len(b)&&end-o<160&&b[end]>=32&&b[end]<127{end++};if end-o<3{return ""};return fmt.Sprintf(" ref=0x%x file=%d %s",a,o,strconv.Quote(string(b[o:end])))}
	pattern:=regexp.MustCompile(os.Args[2])
	fmt.Printf("PCLNTAB_FUNCTIONS=%d TEXT_BASE=0x%x\n",len(ff),text)
	for _,f:=range ff{if !pattern.MatchString(f.name){continue}
		fmt.Printf("\nFUNCTION %s VA=0x%x FILE=%d SIZE=%d\n",f.name,f.start,resolve(f.start),f.end-f.start)
		for pc:=f.start;pc<f.end;{
			o:=resolve(pc);if o<0{panic("unmapped code")}
			inst,err:=x86asm.Decode(b[o:],64);if err!=nil||inst.Len==0{fmt.Printf("  %x file=%d db 0x%02x\n",pc,o,b[o]);pc++;continue}
			note:=""
			for _,arg:=range inst.Args{switch a:=arg.(type){
			case x86asm.Rel:target:=uint64(int64(pc)+int64(inst.Len)+int64(a));note+=fmt.Sprintf(" target=0x%x %s",target,by[target])
			case x86asm.Mem:if a.Base==x86asm.RIP{target:=uint64(int64(pc)+int64(inst.Len)+a.Disp);note+=fmt.Sprintf(" mem=0x%x file=%d",target,resolve(target));note+=preview(target);if at:=resolve(target);at>=0&&at+8<=len(b){note+=preview(binary.LittleEndian.Uint64(b[at:]))}}
			}}
			fmt.Printf("  %016x file=%d %-45s%s\n",pc,o,x86asm.IntelSyntax(inst,pc,nil),note);pc+=uint64(inst.Len)
		}
	}
}
