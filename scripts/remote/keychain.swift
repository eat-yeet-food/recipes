import Foundation
import Security

// Secret bytes travel over stdin/stdout pipes, never process arguments.
let args = CommandLine.arguments
guard args.count == 3, ["get", "set", "create"].contains(args[1]) else { exit(64) }
let query: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrService as String: args[2] == "wrangler" ? "wrangler" : "com.eatyeet.release",
  kSecAttrAccount as String: args[2] == "wrangler" ? "default" : args[2],
]
var status: OSStatus
if args[1] == "get" {
  var read = query
  read[kSecReturnData as String] = true
  read[kSecMatchLimit as String] = kSecMatchLimitOne
  var result: CFTypeRef?
  status = SecItemCopyMatching(read as CFDictionary, &result)
  if status == errSecSuccess, let data = result as? Data {
    FileHandle.standardOutput.write(data)
  }
} else {
  let data = FileHandle.standardInput.readDataToEndOfFile()
  status = args[1] == "create" ? errSecItemNotFound : SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
  if status == errSecItemNotFound {
    var add = query
    add[kSecValueData as String] = data
    add[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    status = SecItemAdd(add as CFDictionary, nil)
  }
}
if status != errSecSuccess {
  FileHandle.standardError.write(Data("Keychain operation failed (\(status)).\n".utf8))
  exit(1)
}
