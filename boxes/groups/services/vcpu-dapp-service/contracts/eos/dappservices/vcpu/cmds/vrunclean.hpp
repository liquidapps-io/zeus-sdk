// vrunclean(uint32_t size, std::vector<char> uri, name current_provider)

auto _self = name(current_receiver());
vcpuentries_t entries(_self, _self.value);
auto cidx = entries.get_index<"byhash"_n>();
auto existing = cidx.find(hashDataVCPU(uri));
if(existing != cidx.end()) cidx.erase(existing);
